import { describe, expect, it } from 'vitest';
import { HealthResponse } from './health.ts';

describe('HealthResponse', () => {
  it('accepts fields added by a newer API, so an older web app keeps working', () => {
    const body = { status: 'ok', version: 'abc1234', apiVersion: 1, database: 'ok' };

    expect(HealthResponse.parse(body)).toEqual({
      status: 'ok',
      version: 'abc1234',
      apiVersion: 1,
    });
  });

  it("rejects anything that isn't a health response, such as an HTML page", () => {
    expect(HealthResponse.safeParse('<!doctype html><title>Salary</title>').success).toBe(false);
    expect(HealthResponse.safeParse({ status: 'starting' }).success).toBe(false);
  });
});
