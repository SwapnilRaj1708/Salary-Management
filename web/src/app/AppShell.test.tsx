import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/render.tsx';

describe('App shell', () => {
  it('sends the home page to the employee directory', async () => {
    const { router } = renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/employees');
  });

  it('tells the user that changes in the shared demo are seen by everyone', async () => {
    renderApp('/employees');

    expect(await screen.findByText(/Changes are saved and seen by everyone/)).toBeVisible();
  });

  it('puts the page content in its own view-transition group, so the app bar stays still', async () => {
    renderApp('/employees');

    const main = await screen.findByRole('main');

    expect(getComputedStyle(main).getPropertyValue('view-transition-name')).toBe('main-content');
  });

  it('marks the current page in the main navigation', async () => {
    renderApp('/employees');
    const nav = await screen.findByRole('navigation', { name: 'Main' });

    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Employees');
  });

  it('navigates to Insights from the main navigation', async () => {
    const user = userEvent.setup();
    renderApp('/employees');

    await user.click(await screen.findByRole('link', { name: 'Insights' }));

    expect(await screen.findByRole('heading', { name: 'Insights' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Insights' })).toHaveAttribute('aria-current', 'page');
  });
});
