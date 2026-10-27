import type { AuthUser } from '@salary/shared';
import { vi } from 'vitest';

export const FAKE_USER: AuthUser = { id: 1, email: 'admin@acme.example' };
export const FAKE_PASSWORD = 'local-demo-password';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
  });

const problem = (status: number, code: string) =>
  json(status, { type: 'about:blank', status, code, title: code, detail: code });

/**
 * Replaces `fetch` with an in-memory stand-in for the auth API, so web tests never touch the
 * network. `signedIn` is the starting state; tests can flip it to simulate an expired session.
 */
export function installFakeApi({ signedIn = true } = {}) {
  const state = { signedIn, requests: [] as string[] };
  vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    state.requests.push(`${method} ${input}`);
    if (method === 'GET' && input === '/api/auth/me') {
      return state.signedIn ? json(200, { user: FAKE_USER }) : problem(401, 'UNAUTHENTICATED');
    }
    if (method === 'POST' && input === '/api/auth/login') {
      const { email, password } = JSON.parse(String(init.body));
      if (email !== FAKE_USER.email || password !== FAKE_PASSWORD) {
        return problem(401, 'INVALID_CREDENTIALS');
      }
      state.signedIn = true;
      return json(200, { user: FAKE_USER });
    }
    if (method === 'POST' && input === '/api/auth/logout') {
      state.signedIn = false;
      return new Response(null, { status: 204 });
    }
    return problem(404, 'NOT_FOUND');
  });
  return state;
}
