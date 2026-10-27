import express, { type Express } from 'express';
import type { ScryptParams } from './auth/password.ts';
import { authRepository } from './auth/repository.ts';
import { authRouter } from './auth/routes.ts';
import { authService } from './auth/service.ts';
import type { Db } from './db/client.ts';
import { onceUntilSuccess, prepareDatabase } from './db/prepare.ts';
import type { Clock } from './domain/clock.ts';
import { employeesRepository } from './employees/repository.ts';
import { employeesRouter } from './employees/routes.ts';
import { employeesService } from './employees/service.ts';
import { exportRouter } from './export/routes.ts';
import { exportService } from './export/service.ts';
import { errorHandler } from './http/errors.ts';
import { healthRouter } from './http/health.ts';
import { requireAuth } from './http/requireAuth.ts';
import { insightsRepository } from './insights/repository.ts';
import { insightsRouter } from './insights/routes.ts';
import { insightsService } from './insights/service.ts';

export type AppDeps = {
  config: {
    version: string;
    /** Whether the session cookie is `Secure`: from config, not from `req.secure`. */
    cookieSecure?: boolean;
    /** The HR user to create at startup if no user has this email. */
    admin?: { email: string; password: string };
    /** The IANA time zone that decides what "today" is (decision X3). */
    timeZone?: string;
  };
  db: Db;
  clock?: Clock;
  /** scrypt cost for the HR user's password; tests pass cheaper ones. */
  passwordParams?: ScryptParams;
  /**
   * Replaces the first-request preparation (migrations, reference data, HR user); tests use
   * it to simulate a database that can't be reached.
   */
  prepare?: (db: Db) => Promise<void>;
};

/** Builds the Express app without listening, so tests can drive it directly. */
const systemClock: Clock = { now: () => Date.now() };

export function buildApp({
  config,
  db,
  clock = systemClock,
  passwordParams,
  prepare,
}: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  const auth = authService({ repo: authRepository(db), clock });
  const { admin } = config;
  const ready = onceUntilSuccess(async () => {
    if (prepare) return prepare(db);
    await prepareDatabase(db);
    if (admin) await auth.ensureHrUser(admin, passwordParams);
  });

  app.use('/api', async (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    // A function has no boot step, so the first request on an instance prepares the
    // database; the rest wait for the same run (docs/architecture.md §10).
    await ready();
    next();
  });
  app.use('/api', express.json({ limit: '100kb' }));
  app.use('/api', healthRouter({ version: config.version, db }));
  app.use('/api', authRouter({ auth, cookieSecure: config.cookieSecure ?? false }));
  const employees = employeesRepository(db);
  const timeZone = config.timeZone ?? 'UTC';
  // Before the employees router: `/employees/export.csv` must not reach `/employees/:id`.
  app.use(
    '/api',
    exportRouter({
      exports: exportService({ employees, clock, timeZone }),
      requireAuth: requireAuth(auth),
    }),
  );
  app.use(
    '/api',
    employeesRouter({
      employees,
      service: employeesService({ repo: employees, clock, timeZone }),
      requireAuth: requireAuth(auth),
    }),
  );
  app.use(
    '/api',
    insightsRouter({
      insights: insightsService(insightsRepository(db)),
      requireAuth: requireAuth(auth),
    }),
  );

  // Requests routed into the API never fall back to the web app, so unknown API
  // routes get problem+json like every other API error.
  app.use('/api', (req, res) => {
    res
      .status(404)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        code: 'NOT_FOUND',
        detail: `No API route for ${req.method} ${req.originalUrl}`,
      });
  });
  app.use(errorHandler);

  return app;
}
