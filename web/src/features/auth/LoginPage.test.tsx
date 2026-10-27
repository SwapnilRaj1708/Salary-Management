import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FAKE_PASSWORD, FAKE_USER } from '../../test/fakeApi.ts';
import { renderApp } from '../../test/render.tsx';
import { safeRedirect } from './LoginPage.tsx';

async function signIn(email = FAKE_USER.email, password = FAKE_PASSWORD) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('signing in', () => {
  it('sends a signed-out visitor to the login page, remembering where they were going', async () => {
    const { router } = renderApp('/insights', { signedIn: false });

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toEqual({ redirect: '/insights' });
  });

  it('signs in and returns to the page the visitor asked for', async () => {
    renderApp('/insights', { signedIn: false });

    await signIn();

    expect(await screen.findByRole('heading', { name: 'Insights' })).toBeInTheDocument();
  });

  it('says the email or password is incorrect, without saying which', async () => {
    renderApp('/login', { signedIn: false });

    await signIn(FAKE_USER.email, 'wrong password');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The email or password is incorrect.',
    );
  });

  it('ignores a redirect to another site and goes to the directory instead', async () => {
    const { router } = renderApp('/login?redirect=%22%2F%2Fevil.example%22', { signedIn: false });

    await signIn();

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/employees');
  });

  it('sends someone who is already signed in from the login page to the directory', async () => {
    renderApp('/login');

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument();
  });
});

describe('the signed-in app bar', () => {
  it('shows who is signed in', async () => {
    renderApp('/employees');

    const banner = await screen.findByRole('banner');

    expect(await within(banner).findByText(FAKE_USER.email)).toBeVisible();
  });

  it('signs out and returns to the login page, after which pages need a login again', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/employees');

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await router.navigate({ to: '/employees' });
    expect(router.state.location.pathname).toBe('/login');
  });
});

describe('safeRedirect', () => {
  it.each([
    ['/insights?country=JP', '/insights?country=JP'],
    ['//evil.example', '/employees'],
    ['https://evil.example', '/employees'],
    [undefined, '/employees'],
  ])('turns %j into %j', (target, expected) => {
    expect(safeRedirect(target)).toBe(expected);
  });
});
