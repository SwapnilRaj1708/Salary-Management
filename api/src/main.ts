import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { openDb } from './db/client.ts';
import { prepareDatabase } from './db/prepare.ts';

const config = loadConfig(process.env);
const db = openDb(config.database);
// Locally, fail at boot rather than on the first request if the database can't be prepared.
await prepareDatabase(db);

const server = buildApp({ config, db }).listen(config.port, '0.0.0.0', (error) => {
  // Express 5 hands bind errors (EADDRINUSE, EACCES) to this callback instead of throwing.
  if (error) throw error;
  console.log(`API listening on :${config.port} (version ${config.version})`);
});

function shutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
