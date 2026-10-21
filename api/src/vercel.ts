import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';

/**
 * Entry point for the "api" service on Vercel (vercel.json): Vercel's Express runtime
 * serves this default export. Locally, main.ts listens instead.
 */
export default buildApp({ config: loadConfig(process.env) });
