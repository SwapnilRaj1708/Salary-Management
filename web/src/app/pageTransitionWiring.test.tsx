import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/render.tsx';

type StartParams = (() => unknown) | { update: () => unknown; types: string[] };
let calls: StartParams[] = [];

// jsdom has no View Transitions. The router only consults its transition types when the
// browser has both of these, so this file stubs them locally; other tests see plain jsdom.
beforeEach(() => {
  calls = [];
  vi.stubGlobal('CSS', { supports: () => true });
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: (params: StartParams) => {
      calls.push(params);
      const update = typeof params === 'function' ? params : params.update;
      return { updateCallbackDone: Promise.resolve(update()) };
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'startViewTransition');
});

describe('page transitions in the router', () => {
  it('starts no view transition on the first render', async () => {
    renderApp('/employees');

    await screen.findByRole('heading', { name: 'Employees' });

    expect(calls).toHaveLength(0);
  });

  it('gives a change of page the page transition type', async () => {
    const { router } = renderApp('/employees');
    await screen.findByRole('heading', { name: 'Employees' });

    await router.navigate({ to: '/insights' });

    expect(calls).toEqual([expect.objectContaining({ types: ['page'] })]);
  });

  it('starts no view transition when the URL changes but the page stays the same', async () => {
    const { router } = renderApp('/employees');
    await screen.findByRole('heading', { name: 'Employees' });

    await router.navigate({ to: '/employees', hash: 'details' });

    expect(router.state.location.hash).toBe('details');
    expect(calls).toHaveLength(0);
  });
});
