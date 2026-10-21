import { describe, expect, it } from 'vitest';
import { API_VERSION } from './index.ts';

describe('API_VERSION', () => {
  it('is a positive integer, so versions can be compared numerically', () => {
    expect(Number.isInteger(API_VERSION)).toBe(true);
    expect(API_VERSION).toBeGreaterThan(0);
  });
});
