import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig(process.env);

const server = buildApp({ config }).listen(config.port, '0.0.0.0', () => {
  console.log(`API listening on :${config.port} (version ${config.version})`);
});

function shutdown(): void {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
