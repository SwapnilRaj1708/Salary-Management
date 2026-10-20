import { describe, expect, it } from 'vitest';
import { pageTransitionTypes } from './pageTransition.ts';

describe('pageTransitionTypes', () => {
  it('animates a navigation to another page', () => {
    expect(pageTransitionTypes({ pathChanged: true })).toEqual(['page']);
  });

  it('does not animate a change of filters, paging or search on the same page', () => {
    expect(pageTransitionTypes({ pathChanged: false })).toBe(false);
  });
});
