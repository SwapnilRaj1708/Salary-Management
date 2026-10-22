import { loadConfig } from '../config.ts';
import { openDb } from '../db/client.ts';
import { prepareDatabase } from '../db/prepare.ts';
import { HEADCOUNT, SEED, SEED_AS_OF } from './catalogue.ts';
import { generateOrg } from './generate.ts';
import { mulberry32 } from './prng.ts';
import { writeOrg } from './write.ts';

// npm run seed [-- --reset]: seeds the database in TURSO_DATABASE_URL (a local file by
// default). Deliberately a command, not an env flag: a forgotten flag would wipe data.
const reset = process.argv.includes('--reset');
const config = loadConfig(process.env);
const target = config.database.url.replace(/\?.*$/, '');
const db = openDb(config.database);

try {
  const started = performance.now();
  await prepareDatabase(db);
  const org = generateOrg({ rng: mulberry32(SEED), count: HEADCOUNT, asOf: SEED_AS_OF });
  const { employees, salaryChanges } = await writeOrg(db, org, { reset });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(
    `Seeded ${employees} employees and ${salaryChanges} salary changes into ${target} in ${seconds} s.`,
  );
} catch (error) {
  console.error(`Seeding ${target} failed:`, error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  db.close();
}
