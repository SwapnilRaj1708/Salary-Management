import {
  ByCountryResponse,
  ByDepartmentResponse,
  ByJobTitleResponse,
  DistributionResponse,
} from '@salary/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { signedInAgent, testApp } from '../test/app.ts';
import { anEmployee, insertRow } from '../test/builders.ts';

// Reference ids follow the order of the fixed lists in db/reference.ts.
const ENGINEERING = 1;
const DATA = 4;
const SALES = 5;
const SOFTWARE_ENGINEER = 2;
const SENIOR_SOFTWARE_ENGINEER = 3;
const DATA_SCIENTIST = 13;

let test: ReturnType<typeof testApp>;
let agent: Awaited<ReturnType<typeof signedInAgent>>;

/**
 * Seven people; every expected number below was worked out by hand from this table.
 * USD rates: USD 1, JPY 150, INR 88 per dollar.
 */
const PEOPLE: Record<string, string | number>[] = [
  {
    full_name: 'Ada',
    country_code: 'US',
    department_id: ENGINEERING,
    job_title_id: SOFTWARE_ENGINEER,
    current_salary_minor: 9_000_000,
  },
  {
    full_name: 'Grace',
    country_code: 'US',
    department_id: DATA,
    job_title_id: DATA_SCIENTIST,
    current_salary_minor: 12_000_000,
  },
  {
    full_name: 'Linus',
    country_code: 'US',
    department_id: ENGINEERING,
    job_title_id: SOFTWARE_ENGINEER,
    current_salary_minor: 10_000_000,
  },
  {
    full_name: 'Gone',
    country_code: 'US',
    department_id: ENGINEERING,
    job_title_id: SOFTWARE_ENGINEER,
    current_salary_minor: 50_000_000,
    status: 'left',
    left_on: '2025-01-31',
  },
  {
    full_name: 'Haruto',
    country_code: 'JP',
    department_id: ENGINEERING,
    job_title_id: SOFTWARE_ENGINEER,
    current_salary_minor: 9_000_000,
  },
  {
    full_name: 'Yui',
    country_code: 'JP',
    department_id: ENGINEERING,
    job_title_id: SENIOR_SOFTWARE_ENGINEER,
    current_salary_minor: 12_000_000,
  },
  {
    full_name: 'Priya',
    country_code: 'IN',
    department_id: SALES,
    job_title_id: SOFTWARE_ENGINEER,
    current_salary_minor: 176_000_000,
  },
];

beforeEach(async () => {
  test = testApp();
  agent = await signedInAgent(test.app); // the first request also prepares the database
  for (const [index, person] of PEOPLE.entries()) {
    await insertRow(
      test.db,
      'employees',
      anEmployee({ ...person, email: `p${index}@acme.example` }),
    );
  }
});

const usd = (amountMinor: number) => ({ amountMinor, currency: 'USD' });
const jpy = (amountMinor: number) => ({ amountMinor, currency: 'JPY' });
const inr = (amountMinor: number) => ({ amountMinor, currency: 'INR' });

describe('the insights routes', () => {
  it.each([
    '/api/insights/by-country',
    '/api/insights/by-job-title',
    '/api/insights/by-department',
    '/api/insights/distribution?country=US',
  ])('%s needs a session', async (path) => {
    expect((await request(test.app).get(path)).status).toBe(401);
  });
});

describe('GET /api/insights/by-country', () => {
  it('gives min, median, average and max in local currency, and USD figures, for active employees', async () => {
    const body = ByCountryResponse.parse((await agent.get('/api/insights/by-country')).body);

    expect(body.fx).toEqual({ asOf: '2026-10-01' });
    expect(body.items).toEqual([
      {
        country: 'IN',
        currency: 'INR',
        headcount: 1,
        min: inr(176_000_000),
        median: inr(176_000_000),
        avg: inr(176_000_000),
        max: inr(176_000_000),
        avgUsd: 20_000,
        payrollUsd: 20_000,
      },
      {
        country: 'JP',
        currency: 'JPY',
        headcount: 2,
        min: jpy(9_000_000),
        median: jpy(10_500_000),
        avg: jpy(10_500_000),
        max: jpy(12_000_000),
        avgUsd: 70_000,
        payrollUsd: 140_000,
      },
      {
        // The leaver's 500,000 is left out of every figure.
        country: 'US',
        currency: 'USD',
        headcount: 3,
        min: usd(9_000_000),
        median: usd(10_000_000),
        avg: usd(10_333_333),
        max: usd(12_000_000),
        avgUsd: 103_333.33,
        payrollUsd: 310_000,
      },
    ]);
  });
});

describe('GET /api/insights/by-job-title', () => {
  it('averages each title across countries in USD, weighting every employee equally', async () => {
    const body = ByJobTitleResponse.parse((await agent.get('/api/insights/by-job-title')).body);

    expect(body.country).toBeNull();
    expect(body.items).toEqual([
      {
        jobTitleId: DATA_SCIENTIST,
        jobTitle: 'Data Scientist',
        headcount: 1,
        countries: 1,
        avgUsd: 120_000,
      },
      {
        jobTitleId: SENIOR_SOFTWARE_ENGINEER,
        jobTitle: 'Senior Software Engineer',
        headcount: 1,
        countries: 1,
        avgUsd: 80_000,
      },
      {
        jobTitleId: SOFTWARE_ENGINEER,
        jobTitle: 'Software Engineer',
        headcount: 4,
        countries: 3,
        avgUsd: 67_500,
      },
    ]);
  });

  it('adds min, average and max in local currency within one country', async () => {
    const body = ByJobTitleResponse.parse(
      (await agent.get('/api/insights/by-job-title').query({ country: 'US' })).body,
    );

    expect(body.country).toBe('US');
    expect(body.items).toEqual([
      {
        jobTitleId: DATA_SCIENTIST,
        jobTitle: 'Data Scientist',
        headcount: 1,
        countries: 1,
        avgUsd: 120_000,
        local: { min: usd(12_000_000), avg: usd(12_000_000), max: usd(12_000_000) },
      },
      {
        jobTitleId: SOFTWARE_ENGINEER,
        jobTitle: 'Software Engineer',
        headcount: 2,
        countries: 1,
        avgUsd: 95_000,
        local: { min: usd(9_000_000), avg: usd(9_500_000), max: usd(10_000_000) },
      },
    ]);
  });

  it('rejects an unknown country', async () => {
    const res = await agent.get('/api/insights/by-job-title').query({ country: 'XX' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });
});

describe('GET /api/insights/by-department', () => {
  it('gives each department its USD payroll, average and share, largest first', async () => {
    const body = ByDepartmentResponse.parse((await agent.get('/api/insights/by-department')).body);

    expect(body.totalUsd).toBe(470_000);
    expect(body.items).toEqual([
      {
        departmentId: ENGINEERING,
        department: 'Engineering',
        headcount: 4,
        payrollUsd: 330_000,
        avgUsd: 82_500,
        share: 0.7021,
      },
      {
        departmentId: DATA,
        department: 'Data',
        headcount: 1,
        payrollUsd: 120_000,
        avgUsd: 120_000,
        share: 0.2553,
      },
      {
        departmentId: SALES,
        department: 'Sales',
        headcount: 1,
        payrollUsd: 20_000,
        avgUsd: 20_000,
        share: 0.0426,
      },
    ]);
  });
});

describe('GET /api/insights/distribution', () => {
  it("gives a country's percentiles in local currency, like PERCENTILE.INC", async () => {
    const body = DistributionResponse.parse(
      (await agent.get('/api/insights/distribution').query({ country: 'US' })).body,
    );

    expect(body).toMatchObject({ country: 'US', currency: 'USD', headcount: 3 });
    expect(body.percentiles).toEqual({
      p10: usd(9_200_000),
      p25: usd(9_500_000),
      p50: usd(10_000_000),
      p75: usd(11_000_000),
      p90: usd(11_600_000),
    });
  });

  it('bins the salaries with round edges, keeping empty bins', async () => {
    const { buckets } = DistributionResponse.parse(
      (await agent.get('/api/insights/distribution').query({ country: 'US' })).body,
    );

    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(3);
    expect(buckets[0]).toEqual({ fromMinor: 9_000_000, toMinor: 9_200_000, count: 1 });
    expect(buckets.at(-1)).toEqual({ fromMinor: 12_000_000, toMinor: 12_200_000, count: 1 });
    expect(buckets.filter((bucket) => bucket.count === 0).length).toBeGreaterThan(0);
  });

  it('answers with no figures for a country without active employees', async () => {
    const body = DistributionResponse.parse(
      (await agent.get('/api/insights/distribution').query({ country: 'DE' })).body,
    );

    expect(body).toEqual({
      country: 'DE',
      currency: 'EUR',
      headcount: 0,
      percentiles: null,
      buckets: [],
    });
  });

  it('needs a country', async () => {
    const res = await agent.get('/api/insights/distribution');

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([expect.objectContaining({ path: 'country' })]);
  });
});
