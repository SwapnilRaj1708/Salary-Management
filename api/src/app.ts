import express, { type Express } from 'express';
import { healthRouter } from './http/health.ts';

export type AppDeps = {
  config: { version: string };
};

/** Builds the Express app without listening, so tests can drive it directly. */
export function buildApp({ config }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', healthRouter({ version: config.version }));

  return app;
}
