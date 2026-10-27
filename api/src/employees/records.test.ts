import { EmployeeDetail, EmployeeListResponse } from '@salary/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { settableClock, signedInAgent, testApp } from '../test/app.ts';

// Reference ids follow the order of the fixed lists in db/reference.ts.
const ENGINEERING = 1;
const DATA = 4;
const SOFTWARE_ENGINEER = 2;
const DATA_SCIENTIST = 13;

// The test clock reads 2026-10-27 09:00 UTC, which is 2026-10-27 in every test time zone.
const TODAY = '2026-10-27';

let test: ReturnType<typeof testApp>;
let agent: Awaited<ReturnType<typeof signedInAgent>>;

beforeEach(async () => {
  test = testApp();
  agent = await signedInAgent(test.app);
});

const newHire = (overrides: Record<string, unknown> = {}) => ({
  fullName: 'Ada Lovelace',
  email: 'ada@acme.example',
  jobTitleId: SOFTWARE_ENGINEER,
  departmentId: ENGINEERING,
  countryCode: 'US',
  hireDate: '2024-03-01',
  salaryMinor: 9_000_000,
  ...overrides,
});

/** Hires someone through the API and returns their detail. */
async function hire(overrides: Record<string, unknown> = {}) {
  const res = await agent.post('/api/employees').send(newHire(overrides));
  if (res.status !== 201) throw new Error(`hire failed: ${res.status} ${JSON.stringify(res.body)}`);
  return EmployeeDetail.parse(res.body);
}

const changeSalary = (id: number, body: Record<string, unknown>) =>
  agent.post(`/api/employees/${id}/salary-changes`).send({
    amountMinor: 9_900_000,
    effectiveDate: '2025-03-01',
    reason: 'annual_review',
    ...body,
  });

const leave = (id: number, leftOn = '2026-06-30') =>
  agent.post(`/api/employees/${id}/leave`).send({ leftOn });

const detail = async (id: number) =>
  EmployeeDetail.parse((await agent.get(`/api/employees/${id}`)).body);

describe('the record routes', () => {
  it.each([
    ['get', '/api/employees/1'],
    ['post', '/api/employees'],
    ['patch', '/api/employees/1'],
    ['post', '/api/employees/1/salary-changes'],
    ['post', '/api/employees/1/leave'],
  ] as const)('%s %s needs a session', async (method, path) => {
    expect((await request(test.app)[method](path).send({})).status).toBe(401);
  });
});

describe('POST /api/employees', () => {
  it('creates an active employee with a hire row and returns their detail', async () => {
    const res = await agent.post('/api/employees').send(newHire({ countryCode: 'GB' }));

    expect(res.status).toBe(201);
    const ada = EmployeeDetail.parse(res.body);
    expect(ada).toMatchObject({
      employeeCode: `EMP-${String(ada.id).padStart(6, '0')}`,
      fullName: 'Ada Lovelace',
      country: 'GB',
      department: 'Engineering',
      jobTitle: 'Software Engineer',
      status: 'active',
      leftOn: null,
      salary: { amountMinor: 9_000_000, currency: 'GBP' },
      fx: { asOf: '2026-10-01' },
    });
    expect(ada.salaryHistory).toEqual([
      {
        id: expect.any(Number),
        effectiveDate: '2024-03-01',
        amount: { amountMinor: 9_000_000, currency: 'GBP' },
        reason: 'hire',
        note: null,
        changePercent: null,
      },
    ]);
  });

  it('records which HR user made the change', async () => {
    const ada = await hire();

    const { rows } = await test.db.execute({
      sql: `SELECT u.email FROM salary_history h JOIN users u ON u.id = h.changed_by_user_id
            WHERE h.employee_id = ?`,
      args: [ada.id],
    });
    expect(rows.map((row) => row.email)).toEqual(['hr@acme.example']);
  });

  it('stores the email in lower case and rejects one already in use, even by a leaver', async () => {
    const ada = await hire({ email: 'Ada@ACME.example' });
    await leave(ada.id);

    const res = await agent.post('/api/employees').send(newHire({ email: 'ADA@acme.example' }));

    expect(ada.email).toBe('ada@acme.example');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('rejects a department or job title that does not exist', async () => {
    const department = await agent.post('/api/employees').send(newHire({ departmentId: 999 }));
    const jobTitle = await agent.post('/api/employees').send(newHire({ jobTitleId: 999 }));

    for (const res of [department, jobTitle]) {
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('UNKNOWN_REFERENCE');
    }
  });

  it('accepts a hire date of today and rejects one after it', async () => {
    const tomorrow = await agent
      .post('/api/employees')
      .send(newHire({ email: 'b@acme.example', hireDate: '2026-10-28' }));

    expect((await hire({ hireDate: TODAY })).hireDate).toBe(TODAY);
    expect(tomorrow.status).toBe(400);
    expect(tomorrow.body.code).toBe('DATE_OUT_OF_RANGE');
  });

  it('takes "today" from the configured time zone', async () => {
    // 20:00 UTC on 27 October is already 28 October in India.
    const late = testApp({
      clock: settableClock(Date.UTC(2026, 9, 27, 20)),
      timeZone: 'Asia/Kolkata',
    });
    const lateAgent = await signedInAgent(late.app);

    const res = await lateAgent.post('/api/employees').send(newHire({ hireDate: '2026-10-28' }));

    expect(res.status).toBe(201);
  });

  it('rejects a hire date before 1950', async () => {
    const res = await agent.post('/api/employees').send(newHire({ hireDate: '1949-12-31' }));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DATE_OUT_OF_RANGE');
  });

  it('rejects a body that fails the contract, listing the fields', async () => {
    const res = await agent
      .post('/api/employees')
      .send(newHire({ salaryMinor: 0, status: 'left' }));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.errors.map((error: { path: string }) => error.path)).toEqual(
      expect.arrayContaining(['salaryMinor', '']),
    );
  });
});

describe('GET /api/employees/:id', () => {
  it('answers 404 for an unknown or malformed id', async () => {
    for (const id of ['42', 'abc', '0', '1.5']) {
      const res = await agent.get(`/api/employees/${id}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    }
  });

  it('lists the salary history newest first, with the change from the row before', async () => {
    const ada = await hire();
    await changeSalary(ada.id, { amountMinor: 9_900_000, effectiveDate: '2025-03-01' });
    await changeSalary(ada.id, {
      amountMinor: 9_405_000,
      effectiveDate: '2025-09-01',
      reason: 'correction',
    });

    const { salaryHistory } = await detail(ada.id);

    expect(
      salaryHistory.map((row) => [
        row.effectiveDate,
        row.amount.amountMinor,
        row.reason,
        row.changePercent,
      ]),
    ).toEqual([
      ['2025-09-01', 9_405_000, 'correction', -5],
      ['2025-03-01', 9_900_000, 'annual_review', 10],
      ['2024-03-01', 9_000_000, 'hire', null],
    ]);
  });
});

describe('PATCH /api/employees/:id', () => {
  it('changes the name, email, department and job title', async () => {
    const ada = await hire();

    const res = await agent.patch(`/api/employees/${ada.id}`).send({
      fullName: 'Ada King',
      email: 'Ada.King@acme.example',
      departmentId: DATA,
      jobTitleId: DATA_SCIENTIST,
    });

    expect(res.status).toBe(200);
    expect(EmployeeDetail.parse(res.body)).toMatchObject({
      fullName: 'Ada King',
      email: 'ada.king@acme.example',
      department: 'Data',
      jobTitle: 'Data Scientist',
      hireDate: ada.hireDate,
      country: ada.country,
    });
  });

  it('rejects an email another employee has', async () => {
    await hire({ email: 'grace@acme.example' });
    const ada = await hire();

    const res = await agent.patch(`/api/employees/${ada.id}`).send({ email: 'grace@acme.example' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('keeps an employee their own email', async () => {
    const ada = await hire();

    const res = await agent
      .patch(`/api/employees/${ada.id}`)
      .send({ email: 'ada@acme.example', fullName: 'Ada King' });

    expect(res.status).toBe(200);
  });

  it('rejects an unknown department', async () => {
    const ada = await hire();

    const res = await agent.patch(`/api/employees/${ada.id}`).send({ departmentId: 999 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNKNOWN_REFERENCE');
  });

  it('refuses to edit a leaver', async () => {
    const ada = await hire();
    await leave(ada.id);

    const res = await agent.patch(`/api/employees/${ada.id}`).send({ fullName: 'Ada King' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMPLOYEE_LEFT');
  });

  it('answers 404 for an unknown employee', async () => {
    expect((await agent.patch('/api/employees/42').send({ fullName: 'X' })).status).toBe(404);
  });
});

describe('POST /api/employees/:id/salary-changes', () => {
  it('adds the change to the history and makes it the current salary', async () => {
    const ada = await hire();

    const res = await changeSalary(ada.id, { amountMinor: 9_900_000, reason: 'promotion' });

    expect(res.status).toBe(201);
    const updated = EmployeeDetail.parse(res.body);
    expect(updated.salary).toEqual({ amountMinor: 9_900_000, currency: 'USD' });
    expect(updated.salaryHistory[0]).toMatchObject({ reason: 'promotion', changePercent: 10 });
    const list = EmployeeListResponse.parse((await agent.get('/api/employees')).body);
    expect(list.items[0]?.salary.amountMinor).toBe(9_900_000);
  });

  it("records the change in the employee's currency", async () => {
    const haruto = await hire({ countryCode: 'JP', salaryMinor: 9_000_000 });

    const updated = EmployeeDetail.parse((await changeSalary(haruto.id, {})).body);

    expect(updated.salaryHistory[0]?.amount).toEqual({ amountMinor: 9_900_000, currency: 'JPY' });
  });

  it('keeps the note', async () => {
    const ada = await hire();

    const res = await changeSalary(ada.id, { reason: 'other', note: 'Retention offer' });

    expect(EmployeeDetail.parse(res.body).salaryHistory[0]?.note).toBe('Retention offer');
  });

  it('rejects a change dated before the latest one', async () => {
    const ada = await hire();
    await changeSalary(ada.id, { effectiveDate: '2025-03-01' });

    const res = await changeSalary(ada.id, { amountMinor: 9_950_000, effectiveDate: '2025-02-28' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EFFECTIVE_DATE_BEFORE_LATEST_CHANGE');
  });

  it('accepts a second change on the same day, and the later one is the current salary', async () => {
    const ada = await hire();
    await changeSalary(ada.id, { amountMinor: 9_900_000, effectiveDate: '2025-03-01' });

    const res = await changeSalary(ada.id, {
      amountMinor: 9_800_000,
      effectiveDate: '2025-03-01',
      reason: 'correction',
    });

    expect(res.status).toBe(201);
    expect(EmployeeDetail.parse(res.body).salary.amountMinor).toBe(9_800_000);
  });

  it('accepts a change dated today and rejects one after today', async () => {
    const ada = await hire();

    const tomorrow = await changeSalary(ada.id, { effectiveDate: '2026-10-28' });
    const today = await changeSalary(ada.id, { effectiveDate: TODAY });

    expect(tomorrow.status).toBe(400);
    expect(tomorrow.body.code).toBe('DATE_OUT_OF_RANGE');
    expect(today.status).toBe(201);
  });

  it('rejects a change that keeps the same salary', async () => {
    const ada = await hire();

    const res = await changeSalary(ada.id, { amountMinor: 9_000_000 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SALARY_UNCHANGED');
  });

  it('refuses a change for a leaver', async () => {
    const ada = await hire();
    await leave(ada.id, '2025-06-30');

    const res = await changeSalary(ada.id, { effectiveDate: '2025-06-30' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMPLOYEE_LEFT');
  });

  it('asks for a note when the reason is "other"', async () => {
    const ada = await hire();

    const res = await changeSalary(ada.id, { reason: 'other' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([expect.objectContaining({ path: 'note' })]);
  });

  it('answers 404 for an unknown employee', async () => {
    expect((await changeSalary(42, {})).status).toBe(404);
  });
});

describe('POST /api/employees/:id/leave', () => {
  it('marks the employee as left, which takes them out of the default list', async () => {
    const ada = await hire();

    const res = await leave(ada.id, '2026-06-30');

    expect(res.status).toBe(200);
    expect(EmployeeDetail.parse(res.body)).toMatchObject({ status: 'left', leftOn: '2026-06-30' });
    const list = EmployeeListResponse.parse((await agent.get('/api/employees')).body);
    expect(list.total).toBe(0);
  });

  it('accepts a leaving date on the hire date, the latest change or today', async () => {
    const onHireDate = await hire({ email: 'a@acme.example' });
    const onLatestChange = await hire({ email: 'b@acme.example' });
    await changeSalary(onLatestChange.id, { effectiveDate: '2025-03-01' });
    const onToday = await hire({ email: 'c@acme.example' });

    expect((await leave(onHireDate.id, '2024-03-01')).status).toBe(200);
    expect((await leave(onLatestChange.id, '2025-03-01')).status).toBe(200);
    expect((await leave(onToday.id, TODAY)).status).toBe(200);
  });

  it('rejects a leaving date before the latest salary change, before hiring, or after today', async () => {
    const ada = await hire();
    await changeSalary(ada.id, { effectiveDate: '2025-03-01' });

    for (const leftOn of ['2025-02-28', '2024-02-29', '2026-10-28']) {
      const res = await leave(ada.id, leftOn);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('DATE_OUT_OF_RANGE');
    }
  });

  it('refuses to mark a leaver as left again', async () => {
    const ada = await hire();
    await leave(ada.id);

    const res = await leave(ada.id);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMPLOYEE_LEFT');
  });
});
