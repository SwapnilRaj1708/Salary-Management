import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { createAppRouter } from '../router.tsx';
import { createAppTheme } from '../theme/theme.ts';

/**
 * Renders the whole app at `path`, with a memory history and the reduced-motion test
 * theme, so every transition completes immediately.
 */
export function renderApp(path: string) {
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const view = render(
    <ThemeProvider theme={createAppTheme({ reducedMotion: 'always' })}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
  return { router, ...view };
}
