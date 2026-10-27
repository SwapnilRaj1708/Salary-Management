import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { createQueryClient } from '../api/queries.ts';
import { createAppRouter } from '../router.tsx';
import { createAppTheme } from '../theme/theme.ts';
import { installFakeApi } from './fakeApi.ts';

/**
 * Renders the whole app at `path` against the fake API (signed in unless told otherwise),
 * with a memory history and the reduced-motion test theme, so every transition completes
 * immediately.
 */
export function renderApp(path: string, { signedIn = true } = {}) {
  const api = installFakeApi({ signedIn });
  const queryClient = createQueryClient(() => {
    void router.navigate({ to: '/login', search: { redirect: router.state.location.href } });
  });
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const view = render(
    <ThemeProvider theme={createAppTheme({ reducedMotion: 'always' })}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return { router, queryClient, api, ...view };
}
