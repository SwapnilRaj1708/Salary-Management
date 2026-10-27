/** The current time in epoch milliseconds, injected so services and tests control "now". */
export type Clock = { now(): number };
