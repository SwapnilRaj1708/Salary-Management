import { describe, expect, it } from 'vitest';
import { ByJobTitleQuery, DistributionQuery } from './insights.ts';

describe('insight queries', () => {
  it('lets the job-title view cover every country or just one', () => {
    expect(ByJobTitleQuery.parse({})).toEqual({});
    expect(ByJobTitleQuery.parse({ country: 'JP' })).toEqual({ country: 'JP' });
    expect(ByJobTitleQuery.safeParse({ country: 'XX' }).success).toBe(false);
  });

  it('needs exactly one country for a distribution', () => {
    expect(DistributionQuery.parse({ country: 'IN' })).toEqual({ country: 'IN' });
    expect(DistributionQuery.safeParse({}).success).toBe(false);
    expect(DistributionQuery.safeParse({ country: 'IN', bins: '20' }).success).toBe(false);
  });
});
