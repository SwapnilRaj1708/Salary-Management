import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render.tsx';

const historyRows = async () => {
  const table = await screen.findByRole('table', { name: 'Salary history' });
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );
};

async function openDialog(name: string) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name }));
  return { user, dialog: within(await screen.findByRole('dialog')) };
}

describe('employee detail', () => {
  it("shows the employee's details and current salary in local currency and USD", async () => {
    renderApp('/employees/1');

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeVisible();
    expect(screen.getByText('EMP-000001 · Software Engineer, Engineering')).toBeVisible();
    expect(screen.getByText('$90,000.00 at the 2026-10-01 rate')).toBeVisible();
    expect(screen.getByText('United States (USD)')).toBeVisible();
  });

  it('lists the salary history newest first, with the change and the reason', async () => {
    renderApp('/employees/1');

    expect(await historyRows()).toEqual([
      ['2024-03-01', '$90,000.00', '+12.5%', 'Annual review', ''],
      ['2022-01-10', '$80,000.00', '—', 'Hire', ''],
    ]);
  });

  it('records a salary change, which becomes the newest history row', async () => {
    const { api } = renderApp('/employees/1');
    const { user, dialog } = await openDialog('Change salary');

    await user.type(dialog.getByLabelText(/New annual salary/), '99,000.50');
    await user.click(dialog.getByRole('combobox', { name: /Reason/ }));
    await user.click(await screen.findByRole('option', { name: 'Promotion' }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Salary change saved')).toBeVisible();
    expect((await historyRows())[0]).toEqual([
      expect.any(String),
      '$99,000.50',
      '+10.0%',
      'Promotion',
      '',
    ]);
    expect(api.bodies.at(-1)).toMatchObject({ amountMinor: 9_900_050, reason: 'promotion' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks for a note before sending a change whose reason is "Other"', async () => {
    const { api } = renderApp('/employees/1');
    const { user, dialog } = await openDialog('Change salary');

    await user.type(dialog.getByLabelText(/New annual salary/), '95,000');
    await user.click(dialog.getByRole('combobox', { name: /Reason/ }));
    await user.click(await screen.findByRole('option', { name: 'Other' }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await dialog.findByText('Add a note when the reason is "other"')).toBeVisible();
    expect(api.bodies).toEqual([]);
  });

  it('explains an amount it cannot read, without sending anything', async () => {
    const { api } = renderApp('/employees/1');
    const { user, dialog } = await openDialog('Change salary');

    await user.type(dialog.getByLabelText(/New annual salary/), '99,000.505');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await dialog.findByText('Too many decimal places for this currency')).toBeVisible();
    expect(api.bodies).toEqual([]);
  });

  it("puts the API's refusal of an unchanged salary under the amount", async () => {
    renderApp('/employees/1');
    const { user, dialog } = await openDialog('Change salary');

    await user.type(dialog.getByLabelText(/New annual salary/), '90,000');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(
      await dialog.findByText('This is the current salary; enter a different amount'),
    ).toBeVisible();
  });

  it('edits the details, sending only what changed', async () => {
    const { api } = renderApp('/employees/1');
    const { user, dialog } = await openDialog('Edit details');

    await user.click(dialog.getByRole('combobox', { name: /Department/ }));
    await user.click(await screen.findByRole('option', { name: 'Sales' }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Details saved')).toBeVisible();
    expect(screen.getByText('EMP-000001 · Software Engineer, Sales')).toBeVisible();
    expect(api.bodies.at(-1)).toEqual({ departmentId: 5 });
  });

  it('shows a taken email under the email field', async () => {
    renderApp('/employees/1');
    const { user, dialog } = await openDialog('Edit details');
    const email = dialog.getByLabelText(/Email/);

    await user.clear(email);
    await user.type(email, 'haruto.sato@acme.example');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await dialog.findByText('Another employee already has this email')).toBeVisible();
  });

  it('marks the employee as left, after which the record is read-only', async () => {
    const { api } = renderApp('/employees/1');
    const { user, dialog } = await openDialog('Mark as left');

    await user.click(dialog.getByRole('button', { name: 'Mark as left' }));

    expect(await screen.findByText('Ada Lovelace is marked as left')).toBeVisible();
    expect(screen.getByText(/Their record is read-only/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Change salary' })).not.toBeInTheDocument();
    expect(api.bodies.at(-1)).toEqual({ leftOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
  });

  it("offers no changes on a leaver's page", async () => {
    renderApp('/employees/30');

    expect(await screen.findByText(/Zed Leaver left on 2025-03-31/)).toBeVisible();
    expect(screen.getByText('Left 2025-03-31')).toBeVisible();
    for (const name of ['Change salary', 'Edit details', 'Mark as left']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('says so when there is no employee with the id', async () => {
    renderApp('/employees/999');

    expect(await screen.findByText('There is no employee with this id.')).toBeVisible();
  });

  it('treats a malformed id as no employee, without asking the API', async () => {
    const { api } = renderApp('/employees/abc');

    expect(await screen.findByText('There is no employee with this id.')).toBeVisible();
    await waitFor(() =>
      expect(api.requests.filter((r) => r.startsWith('GET /api/employees'))).toEqual([]),
    );
  });

  it('goes back to the directory from the breadcrumb', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/employees/1');

    const breadcrumb = within(await screen.findByRole('navigation', { name: 'Breadcrumb' }));
    await user.click(breadcrumb.getByRole('link', { name: 'Employees' }));

    // Waiting for the lazy directory page to render lets the navigation finish inside the
    // test; otherwise it can settle after the test environment is gone.
    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/employees');
  });
});
