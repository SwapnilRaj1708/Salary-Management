import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { openDb } from './db/client.ts';

const config = loadConfig(process.env);

/**
 * Entry point for the "api" service on Vercel (vercel.json): Vercel's Express runtime
 * serves this default export. The first request on a fresh instance prepares the database.
 * Locally, main.ts listens instead.
 */
export default buildApp({ config, db: openDb(config.database) });
