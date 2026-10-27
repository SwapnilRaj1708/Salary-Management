import type { Migration } from '../migrate.ts';
import { initial } from './001-initial.ts';
import { recordTriggers } from './002-record-triggers.ts';

/** Every migration, oldest first. Never edit one that has been merged; add a new one. */
export const MIGRATIONS: readonly Migration[] = [initial, recordTriggers];
