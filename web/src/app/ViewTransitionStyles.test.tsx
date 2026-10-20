import { ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createAppTheme } from '../theme/theme.ts';
import { ViewTransitionStyles } from './ViewTransitionStyles.tsx';

function renderedCss(): string {
  render(
    <ThemeProvider theme={createAppTheme()}>
      <ViewTransitionStyles />
    </ThemeProvider>,
  );
  return Array.from(document.querySelectorAll('style'))
    .map((style) => style.textContent)
    .join('\n');
}

describe('ViewTransitionStyles', () => {
  it('makes every view transition invisible unless it is a page change', () => {
    expect(renderedCss()).toMatch(
      /::view-transition-group\(\*\),::view-transition-old\(\*\),::view-transition-new\(\*\)\{[^}]*\banimation:none;/,
    );
  });

  it('animates page changes only when the user has not asked for reduced motion', () => {
    const css = renderedCss();

    expect(css).toMatch(
      /@media \(prefers-reduced-motion: no-preference\)\{[^@]*html:active-view-transition-type\(page\)::view-transition-new\(main-content\)\{[^}]*\banimation:200ms cubic-bezier\(0\.05, 0\.7, 0\.1, 1\) both page-in;/,
    );
  });
});
