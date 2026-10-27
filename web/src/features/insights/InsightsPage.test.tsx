import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render.tsx';

const section = async (name: string) => within(await screen.findByRole('region', { name }));

const bodyRows = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent));

async function choose(region: ReturnType<typeof within>, option: string) {
  const user = userEvent.setup();
  await user.click(region.getByRole('combobox', { name: 'Country' }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('insights', () => {
  it('sums headcount and USD payroll over active employees in the headline figures', async () => {
    renderApp('/insights');

    const headcount = await screen.findByRole('group', { name: 'Active employees' });
    await waitFor(() => expect(headcount).toHaveTextContent(/6$/));
    expect(screen.getByRole('group', { name: 'Annual base payroll (USD)' })).toHaveTextContent(
      '$470,000.00',
    );
    expect(screen.getByRole('group', { name: 'Countries' })).toHaveTextContent(/3$/);
  });

  it('shows each country in its own currency, largest payroll first', async () => {
    renderApp('/insights');
    const countries = await section('Pay by country');

    const rows = bodyRows(await countries.findByRole('table'));

    expect(rows.map((row) => row[0])).toEqual(['United States', 'Japan', 'India']);
    expect(rows[0]).toEqual([
      'United States',
      '3',
      '$90,000.00',
      '$100,000.00',
      '$103,333.33',
      '$120,000.00',
      '$103,333.33',
      '$310,000.00',
    ]);
    expect(rows[1]?.slice(2, 6)).toEqual([
      '¥9,000,000',
      '¥10,500,000',
      '¥10,500,000',
      '¥12,000,000',
    ]);
  });

  it('sorts a table by a column when its header is clicked', async () => {
    const user = userEvent.setup();
    renderApp('/insights');
    const countries = await section('Pay by country');
    const table = await countries.findByRole('table');

    await user.click(countries.getByRole('button', { name: 'Country' }));

    expect(bodyRows(table).map((row) => row[0])).toEqual(['India', 'Japan', 'United States']);
  });

  it("gives each department's payroll and share of the total", async () => {
    renderApp('/insights');
    const departments = await section('Payroll by department');

    const rows = bodyRows(await departments.findByRole('table'));

    expect(rows[0]).toEqual(['Engineering', '4', '$330,000.00', '70.2%', '$82,500.00']);
  });

  it('compares job titles across countries in USD, or within one country in its currency', async () => {
    const { router, api } = renderApp('/insights');
    const titles = await section('Average pay by job title');
    expect(await titles.findByText('Senior Software Engineer')).toBeVisible();

    await choose(titles, 'United States');

    await waitFor(() => expect(router.state.location.search).toMatchObject({ titleCountry: 'US' }));
    await waitFor(() =>
      expect(bodyRows(titles.getByRole('table'))[0]).toEqual([
        'Data Scientist',
        '1',
        '$120,000.00',
        '$120,000.00',
        '$120,000.00',
        '$120,000.00',
      ]),
    );
    expect(api.requests).toContain('GET /api/insights/by-job-title?country=US');
  });

  it("shows a country's percentiles in its own currency, United States first", async () => {
    renderApp('/insights');
    const distribution = await section('Pay distribution');

    expect(await distribution.findByText('$100,000.00')).toBeVisible();
    expect(distribution.getByText('$92,000.00')).toBeVisible();
    expect(distribution.getByText('3 active employees in United States')).toBeVisible();
  });

  it('switches the distribution to another country and keeps the choice in the URL', async () => {
    const { router } = renderApp('/insights');
    const distribution = await section('Pay distribution');
    await distribution.findByText('$100,000.00');

    await choose(distribution, 'Japan');

    expect(await distribution.findByText('¥10,500,000')).toBeVisible();
    expect(router.state.location.search).toMatchObject({ distributionCountry: 'JP' });
  });

  it('says so when a country has no active employees', async () => {
    renderApp('/insights?distributionCountry=DE');
    const distribution = await section('Pay distribution');

    expect(await distribution.findByText('No active employees in Germany')).toBeVisible();
  });

  it('falls back to the United States for a bad bookmark', async () => {
    const { router } = renderApp('/insights?distributionCountry=XX&titleCountry=nope');
    const distribution = await section('Pay distribution');

    expect(await distribution.findByText('3 active employees in United States')).toBeVisible();
    expect(router.state.location.search).toEqual({});
  });
});
