import { ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createAppTheme } from '../theme/theme.ts';
import { ViewTransitionStyles } from './ViewTransitionStyles.tsx';

/** Renders the styles and returns the CSS rules jsdom parsed from them. */
function renderedRules(): CSSRule[] {
  render(
    <ThemeProvider theme={createAppTheme()}>
      <ViewTransitionStyles />
    </ThemeProvider>,
  );
  return Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules));
}

describe('ViewTransitionStyles', () => {
  it('makes every view transition invisible by default, outside any media query', () => {
    const topLevel = renderedRules().filter((rule) => rule instanceof CSSStyleRule);

    expect(topLevel.map((rule) => rule.selectorText)).toEqual([
      '::view-transition-group(*),::view-transition-old(*),::view-transition-new(*)',
    ]);
    expect(topLevel[0]?.style.getPropertyValue('animation')).toBe('none');
  });

  it('animates only page changes, and only without a reduced-motion preference', () => {
    const media = renderedRules().filter((rule) => rule instanceof CSSMediaRule);

    expect(media.map((rule) => rule.conditionText)).toEqual([
      '(prefers-reduced-motion: no-preference)',
    ]);
    const pageRules = Array.from(media[0]?.cssRules ?? []).filter(
      (rule) => rule instanceof CSSStyleRule,
    );
    expect(pageRules.map((rule) => rule.selectorText)).toEqual([
      'html:active-view-transition-type(page)::view-transition-old(main-content)',
      'html:active-view-transition-type(page)::view-transition-new(main-content)',
    ]);
    expect(pageRules[1]?.style.getPropertyValue('animation')).toBe(
      '200ms cubic-bezier(0.05, 0.7, 0.1, 1) both page-in',
    );
  });
});
