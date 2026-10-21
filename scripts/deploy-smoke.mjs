// Deploy smoke test, run by the `deploy-smoke` CI job (.github/workflows/ci.yml).
//
// 1. Boots the API the local way (`node api/src/main.ts`), which proves that Node's type
//    stripping works through the `@salary/shared` workspace symlink.
// 2. Builds the repo with Vercel's own CLI, as a Vercel deployment does (vercel.json).
// 3. Checks the build output: `/api/*` routes to the api service and everything else to the
//    web app's index.html, then boots the built API function and calls it.
//
// Usage: node scripts/deploy-smoke.mjs (from the repo root, after `npm ci`).

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const VERCEL_CLI = 'vercel@65.0.0';
const OUTPUT = '.vercel/output';
const COMMIT = 'deploy-smoke-sha';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const pass = (message) => console.log(`✓ ${message}`);
// A server that never answers fails the check instead of hanging the job.
const get = (url) => fetch(url, { signal: AbortSignal.timeout(10_000) });

async function expectHealthyApi(baseUrl, version) {
  const health = await get(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  const body = await health.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.version, version);

  for (const path of ['/api/nope', '/api']) {
    const unknown = await get(`${baseUrl}${path}`);
    assert.equal(unknown.status, 404, path);
    assert.match(unknown.headers.get('content-type') ?? '', /^application\/problem\+json/, path);
  }
}

async function checkLocalBoot() {
  const { VERCEL_GIT_COMMIT_SHA: _, ...env } = process.env;
  const api = spawn(process.execPath, ['api/src/main.ts'], {
    env: { ...env, PORT: '3999' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  try {
    // main.ts logs once it listens; a crash at boot ends the process instead.
    const listening = new Promise((resolve, reject) => {
      api.stdout.on('data', (chunk) => {
        if (String(chunk).includes('API listening')) resolve();
      });
      api.on('exit', (code) => reject(new Error(`node api/src/main.ts exited with ${code}`)));
    });
    await listening;
    await expectHealthyApi('http://127.0.0.1:3999', 'dev');
    pass('the API boots with node api/src/main.ts and answers /api/health');
  } finally {
    api.kill();
  }
}

function vercelBuild() {
  // `vercel build` needs a linked project. A stub is enough to build offline; a real link,
  // if a developer has one, is left alone.
  if (!existsSync('.vercel/project.json')) {
    mkdirSync('.vercel', { recursive: true });
    writeFileSync(
      '.vercel/project.json',
      JSON.stringify({
        projectId: 'prj_smoke',
        orgId: 'team_smoke',
        settings: { framework: 'services' },
      }),
    );
  }
  const build = spawnSync('npx', ['--yes', VERCEL_CLI, 'build', '--yes'], {
    stdio: 'inherit',
    env: { ...process.env, VERCEL_TELEMETRY_DISABLED: '1' },
  });
  assert.equal(build.status, 0, 'vercel build failed');
  pass(`${VERCEL_CLI} build succeeds`);
}

/** The service the deployment's routing table sends a request path to. */
function serviceFor(path, routes) {
  const route = routes.find((r) => r.src && new RegExp(r.src).test(path));
  return route?.destination?.service;
}

function checkRouting() {
  const { routes } = readJson(join(OUTPUT, 'config.json'));
  for (const path of ['/api', '/api/', '/api/health', '/api/employees/42']) {
    assert.equal(serviceFor(path, routes), 'api', path);
  }
  for (const path of ['/', '/apix', '/employees/42']) {
    assert.equal(serviceFor(path, routes), 'web', path);
  }
  pass('/api/* routes to the api service, every other path to web');

  const web = join(OUTPUT, 'services/web');
  assert.ok(existsSync(join(web, 'static/index.html')), 'web has no index.html');
  const spaFallback = (readJson(join(web, 'config.json')).routes ?? []).find(
    (r) => r.src && new RegExp(r.src).test('/employees/42'),
  );
  assert.equal(spaFallback?.dest, '/index.html');
  pass('web serves index.html for deep links');
}

async function checkApiFunction() {
  const functions = join(OUTPUT, 'services/api/functions');
  const [funcName, ...others] = readdirSync(functions).filter((name) => name.endsWith('.func'));
  assert.ok(funcName && others.length === 0, 'expected exactly one api function');
  const funcDir = join(functions, funcName);
  const { handler, runtime, filePathMap = {} } = readJson(join(funcDir, '.vc-config.json'));
  assert.equal(runtime, 'nodejs22.x');

  // A local build lists the function's dependencies in filePathMap instead of copying them,
  // so assemble the function the way Vercel uploads it.
  const root = mkdtempSync(join(tmpdir(), 'api-func-'));
  for (const [target, source] of Object.entries(filePathMap)) {
    mkdirSync(dirname(join(root, target)), { recursive: true });
    cpSync(source, join(root, target), { recursive: true, verbatimSymlinks: true });
  }
  cpSync(funcDir, root, { recursive: true, verbatimSymlinks: true });

  process.env.VERCEL_GIT_COMMIT_SHA = COMMIT;
  const { default: app } = await import(pathToFileURL(join(root, handler)).href);
  assert.equal(typeof app, 'function', `${handler} must default-export the Express app`);
  const server = createServer(app).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await expectHealthyApi(`http://127.0.0.1:${server.address().port}`, COMMIT);
    pass(`the built api function (${runtime}) answers /api/health with the deployed commit`);
  } finally {
    server.close();
  }
}

await checkLocalBoot();
vercelBuild();
checkRouting();
await checkApiFunction();
