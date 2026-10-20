import { describe, expect, it } from 'vitest';
import { pageTransitionTypes } from './pageTransition.ts';

const employees = { pathname: '/employees' };

describe('pageTransitionTypes', () => {
  it('animates a navigation from one page to another', () => {
    expect(pageTransitionTypes({ fromLocation: employees, pathChanged: true })).toEqual(['page']);
  });

  it('does not animate a change of filters, paging or search on the same page', () => {
    expect(pageTransitionTypes({ fromLocation: employees, pathChanged: false })).toBe(false);
  });

  it('does not animate the first render, such as a reload or a deep link', () => {
    // On the first load there is no previous location, so the router reports a path change.
    expect(pageTransitionTypes({ fromLocation: undefined, pathChanged: true })).toBe(false);
  });
});
