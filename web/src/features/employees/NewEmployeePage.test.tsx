import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render.tsx';

async function choose(user: ReturnType<typeof userEvent.setup>, field: RegExp, option: string) {
  await user.click(await screen.findByRole('combobox', { name: field }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, email = 'grace@acme.example') {
  await user.type(await screen.findByLabelText(/Full name/), 'Grace Hopper');
  await user.type(screen.getByLabelText(/Email/), email);
  await choose(user, /Country/, 'Japan');
  await choose(user, /Department/, 'Engineering');
  await choose(user, /Job title/, 'Software Engineer');
  await user.type(screen.getByLabelText(/Starting annual salary/), '9,000,000');
}

describe('add employee', () => {
  it('creates the employee and opens their page', async () => {
    const user = userEvent.setup();
    const { router, api } = renderApp('/employees/new');

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Add employee' }));

    expect(await screen.findByRole('heading', { name: 'Grace Hopper' })).toBeVisible();
    expect(screen.getByText('Grace Hopper added')).toBeVisible();
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/employees\/\d+$/));
    expect(api.bodies.at(-1)).toEqual({
      fullName: 'Grace Hopper',
      email: 'grace@acme.example',
      countryCode: 'JP',
      departmentId: 1,
      jobTitleId: 2,
      hireDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      salaryMinor: 9_000_000,
    });
  });

  it("takes the salary currency from the country, with that currency's decimals", async () => {
    const user = userEvent.setup();
    renderApp('/employees/new');

    await choose(user, /Country/, 'Japan');
    await user.type(screen.getByLabelText(/Starting annual salary/), '9,000,000.50');
    await user.click(screen.getByRole('button', { name: 'Add employee' }));

    expect(screen.getByText('JPY')).toBeVisible();
    expect(await screen.findByText('Too many decimal places for this currency')).toBeVisible();
  });

  it('marks every missing field without sending anything', async () => {
    const user = userEvent.setup();
    const { api } = renderApp('/employees/new');

    await user.click(await screen.findByRole('button', { name: 'Add employee' }));

    for (const message of [
      'Enter the full name',
      'Choose a country',
      'Choose a department',
      'Choose a job title',
    ]) {
      expect(await screen.findByText(message)).toBeVisible();
    }
    expect(api.bodies).toEqual([]);
  });

  it('shows a taken email under the email field', async () => {
    const user = userEvent.setup();
    renderApp('/employees/new');

    await fillForm(user, 'ada.lovelace@acme.example');
    await user.click(screen.getByRole('button', { name: 'Add employee' }));

    expect(await screen.findByText('Another employee already has this email')).toBeVisible();
  });
});
