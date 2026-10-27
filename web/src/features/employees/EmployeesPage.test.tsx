import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render.tsx';

const employeeRequests = (api: { requests: string[] }) =>
  api.requests.filter((r) => r.startsWith('GET /api/employees'));

async function grid() {
  return within(await screen.findByRole('grid'));
}

describe('employee directory', () => {
  it('shows the first page of active employees with local and USD salaries', async () => {
    renderApp('/employees');

    const rows = await grid();
    const haruto = within(
      // biome-ignore lint/style/noNonNullAssertion: the name cell sits inside its row
      (await rows.findByText('Haruto Sato')).closest('[role="row"]')! as HTMLElement,
    );
    expect(haruto.getByText('EMP-000002')).toBeVisible();
    expect(haruto.getByText('Japan')).toBeVisible();
    expect(haruto.getByText('¥9,000,000')).toBeVisible();
    expect(haruto.getByText('$60,000.00')).toBeVisible();
    expect(rows.queryByText('Zed Leaver')).not.toBeInTheDocument();
  });

  it('shows how many employees match and the date of the exchange rates', async () => {
    renderApp('/employees');

    expect(
      await screen.findByText('29 employees · USD at static rates as of 2026-10-01'),
    ).toBeVisible();
  });

  it('searches after typing stops, putting the search in the URL and asking the API', async () => {
    const user = userEvent.setup();
    const { router, api } = renderApp('/employees');

    await user.type(await screen.findByLabelText('Search'), 'haruto');

    await waitFor(() => expect(router.state.location.search).toMatchObject({ q: 'haruto' }));
    // The request follows the URL change after a render, so wait for it rather than race it.
    await waitFor(() => expect(employeeRequests(api).at(-1)).toContain('q=haruto'));
    expect(await (await grid()).findByText('Haruto Sato')).toBeVisible();
    await waitFor(async () =>
      expect((await grid()).queryByText('Ada Lovelace')).not.toBeInTheDocument(),
    );
  });

  it('filters by country from the URL and starts again at page 1 when the filter changes', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/employees?page=2');

    await user.click(await screen.findByLabelText('Country'));
    await user.click(await screen.findByRole('option', { name: 'Japan' }));

    await waitFor(() => expect(router.state.location.search).toEqual({ country: 'JP' }));
    expect(await (await grid()).findByText('Haruto Sato')).toBeVisible();
  });

  it('pages through the directory with the page in the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/employees');
    // The button stays disabled until the first page and its total have arrived.
    await (await grid()).findByText('Ada Lovelace');

    await user.click(screen.getByRole('button', { name: /next page/i }));

    await waitFor(() => expect(router.state.location.search).toEqual({ page: 2 }));
    expect(await (await grid()).findByText('Person 27')).toBeVisible();
  });

  it('sorts on the server when a column header is clicked', async () => {
    const user = userEvent.setup();
    const { router, api } = renderApp('/employees');

    await user.click(await screen.findByRole('columnheader', { name: /salary \(usd\)/i }));

    await waitFor(() => expect(router.state.location.search).toEqual({ sort: 'salaryUsd' }));
    await waitFor(() => expect(employeeRequests(api).at(-1)).toContain('sort=salaryUsd'));
  });

  it('falls back to the default view for a bad bookmark instead of showing an error', async () => {
    const { router } = renderApp('/employees?page=%22abc%22&status=%22everyone%22&sort=%22evil%22');

    expect(await (await grid()).findByText('Ada Lovelace')).toBeVisible();
    expect(screen.getByLabelText('Status')).toHaveTextContent('Active');
    expect(router.state.location.search).toEqual({});
  });

  it('offers to clear the filters when nothing matches', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/employees?q=%22nobody%22');

    expect(await screen.findByText('No employees match these filters')).toBeVisible();
    await user.click(
      within(await screen.findByRole('grid')).getByRole('button', { name: 'Clear filters' }),
    );

    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(await (await grid()).findByText('Ada Lovelace')).toBeVisible();
  });

  it("opens an employee's page from their name", async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/employees');

    await user.click(await (await grid()).findByRole('link', { name: 'Haruto Sato' }));

    expect(await screen.findByRole('heading', { name: 'Haruto Sato' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/employees/2');
  });

  it('goes to the new-employee form from Add employee', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/employees');

    await user.click(await screen.findByRole('link', { name: 'Add employee' }));

    expect(await screen.findByRole('heading', { name: 'Add employee' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/employees/new');
  });

  it('marks the grid busy while a page is loading, for assistive technology', async () => {
    renderApp('/employees');

    const grid = await screen.findByRole('grid');
    // biome-ignore lint/style/noNonNullAssertion: the grid always sits in the busy wrapper
    const wrapper = grid.closest('[aria-busy]')!;
    await waitFor(() => expect(wrapper).toHaveAttribute('aria-busy', 'false'));
  });

  it('lets the grid take the height left in the window, down to a minimum', async () => {
    renderApp('/employees');

    const grid = await screen.findByRole('grid');
    // biome-ignore lint/style/noNonNullAssertion: the grid always sits in the busy wrapper
    const wrapper = getComputedStyle(grid.closest('[aria-busy]')!);
    expect(wrapper.flexGrow).toBe('1');
    expect(wrapper.flexBasis).toBe('0px');
    expect(wrapper.minHeight).toBe('400px');
  });
});
