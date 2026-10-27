import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createQueryClient } from './api/queries.ts';
import { createAppRouter } from './router.tsx';
import { createAppTheme } from './theme/theme.ts';

const theme = createAppTheme();
// An expired session anywhere sends the user to login, then back to where they were.
const queryClient = createQueryClient(() => {
  void router.navigate({ to: '/login', search: { redirect: router.state.location.href } });
});
const router = createAppRouter({ queryClient });

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
