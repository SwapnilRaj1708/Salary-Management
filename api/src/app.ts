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

  return app;
}
