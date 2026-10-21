import type { Migration } from '../migrate.ts';

/** Every migration, oldest first. Never edit one that has been merged; add a new one. */
export const MIGRATIONS: readonly Migration[] = [];
