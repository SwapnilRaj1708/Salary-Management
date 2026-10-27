import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { settableClock, signedInAgent, testApp } from '../test/app.ts';
import { anEmployee, insertRow } from '../test/builders.ts';

// Reference ids follow the order of the fixed lists in db/reference.ts.
const ENGINEERING = 1;
const SALES = 5;
const SOFTWARE_ENGINEER = 2;

const HEADER =
  'Employee code,Full name,Email,Country,Department,Job title,Hire date,Status,Left on,' +
  'Currency,Salary,Salary (USD at 2026-10-01 rates)';

let test: ReturnType<typeof testApp>;
let agent: Awaited<ReturnType<typeof signedInAgent>>;

const person = (overrides: Record<string, string | number>) =>
  anEmployee({ department_id: ENGINEERING, job_title_id: SOFTWARE_ENGINEER, ...overrides });

beforeEach(async () => {
  // 20:00 UTC on 27 October is already 28 October in India.
  test = testApp({ clock: settableClock(Date.UTC(2026, 9, 27, 20)), timeZone: 'Asia/Kolkata' });
  agent = await signedInAgent(test.app);
  const rows: Record<string, string | number>[] = [
    // 1–4, inserted in id order
    {
      full_name: 'Ada Lovelace',
      email: 'ada@acme.example',
      country_code: 'US',
      hire_date: '2020-01-10',
      current_salary_minor: 9_000_000,
    },
    {
      full_name: 'Haruto Sato',
      email: 'haruto@acme.example',
      country_code: 'JP',
      hire_date: '2021-03-01',
      current_salary_minor: 9_000_000,
    },
    {
      full_name: 'Priya Sharma',
      email: 'priya@acme.example',
      country_code: 'IN',
      department_id: SALES,
      hire_date: '2022-07-15',
      current_salary_minor: 180_000_000,
    },
    {
      full_name: 'Lukas Müller',
      email: 'lukas@acme.example',
      country_code: 'DE',
      hire_date: '2018-02-01',
      current_salary_minor: 6_000_000,
      status: 'left',
      left_on: '2024-06-30',
    },
  ];
  for (const row of rows) await insertRow(test.db, 'employees', person(row));
});

/** The response as text (superagent buffers text/* bodies), split into lines without the BOM. */
async function exportCsv(query: Record<string, string> = {}) {
  const res = await agent.get('/api/employees/export.csv').query(query);
  const text = res.text ?? '';
  return {
    res,
    text,
    lines: text
      .replace(/^\uFEFF/, '')
      .split('\r\n')
      .slice(0, -1),
  };
}

describe('GET /api/employees/export.csv', () => {
  it('needs a session', async () => {
    expect((await request(test.app).get('/api/employees/export.csv')).status).toBe(401);
  });

  it("downloads as a UTF-8 CSV attachment named with today's date", async () => {
    const { res, text } = await exportCsv();

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="employees-2026-10-28.csv"',
    );
    // The byte-order mark makes Excel read "Müller" as UTF-8.
    expect(text.startsWith('﻿')).toBe(true);
  });

  it('writes one row per employee, with local salary in its currency and USD to the cent', async () => {
    const { lines } = await exportCsv();

    expect(lines).toEqual([
      HEADER,
      'EMP-000001,Ada Lovelace,ada@acme.example,United States,Engineering,Software Engineer,2020-01-10,active,,USD,90000.00,90000.00',
      'EMP-000002,Haruto Sato,haruto@acme.example,Japan,Engineering,Software Engineer,2021-03-01,active,,JPY,9000000,60000.00',
      'EMP-000003,Priya Sharma,priya@acme.example,India,Sales,Software Engineer,2022-07-15,active,,INR,1800000.00,20454.55',
    ]);
  });

  it("follows the directory's filters and sort", async () => {
    const leavers = await exportCsv({ status: 'left' });
    const bySalary = await exportCsv({ status: 'all', sort: '-salaryUsd' });

    expect(leavers.lines.slice(1)).toEqual([
      'EMP-000004,Lukas Müller,lukas@acme.example,Germany,Engineering,Software Engineer,2018-02-01,left,2024-06-30,EUR,60000.00,65217.39',
    ]);
    expect(bySalary.lines.slice(1).map((line) => line.slice(0, 10))).toEqual([
      'EMP-000001',
      'EMP-000004',
      'EMP-000002',
      'EMP-000003',
    ]);
  });

  it('exports every match, not one page', async () => {
    for (let i = 0; i < 30; i += 1) {
      await insertRow(test.db, 'employees', person({ email: `extra${i}@acme.example` }));
    }

    const { lines } = await exportCsv();

    expect(lines).toHaveLength(1 + 33);
  });

  it('defuses a name that a spreadsheet would run as a formula', async () => {
    await insertRow(
      test.db,
      'employees',
      person({ full_name: '=HYPERLINK("http://evil.example","Click")', email: 'x@acme.example' }),
    );

    const { lines } = await exportCsv({ q: 'evil' });

    expect(lines[1]).toContain(`"'=HYPERLINK(""http://evil.example"",""Click"")"`);
  });

  it('rejects paging and unknown sort keys', async () => {
    for (const query of [{ page: '2' }, { sort: 'salary' }]) {
      const res = await agent.get('/api/employees/export.csv').query(query);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    }
  });
});
