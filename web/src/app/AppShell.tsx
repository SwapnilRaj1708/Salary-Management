import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useQuery } from '@tanstack/react-query';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { meQuery, useLogout } from '../api/queries.ts';
import { ButtonLink } from './ButtonLink.tsx';
import { ToastProvider } from './Toasts.tsx';
import { PAGE_CONTENT_TRANSITION, ViewTransitionStyles } from './ViewTransitionStyles.tsx';

const navLinkSx = {
  color: 'text.secondary',
  '&[aria-current="page"]': { color: 'primary.main', bgcolor: 'action.selected' },
} as const;

export function AppShell() {
  const { data: user } = useQuery(meQuery);
  const logout = useLogout();
  const navigate = useNavigate();
  const signOut = () =>
    logout.mutate(undefined, { onSettled: () => navigate({ to: '/login', replace: true }) });

  // A full-height column: the app bar stays at the top while the page scrolls, and a page
  // can fill the rest of the viewport (the directory's grid does).
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <ViewTransitionStyles />
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: { xs: 1, sm: 3 } }}>
          {/* On a phone the title and email give way, so navigation and Sign out still fit. */}
          <Typography
            variant="h6"
            component="span"
            noWrap
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            Salary Management
          </Typography>
          <Box component="nav" aria-label="Main">
            <Stack direction="row" spacing={1}>
              <ButtonLink to="/employees" sx={navLinkSx}>
                Employees
              </ButtonLink>
              <ButtonLink to="/insights" sx={navLinkSx}>
                Insights
              </ButtonLink>
            </Stack>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {user && (
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { xs: 'none', md: 'block' } }}
              >
                {user.email}
              </Typography>
              <Button color="inherit" onClick={signOut} loading={logout.isPending}>
                Sign out
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      <Container
        component="main"
        maxWidth="xl"
        sx={{
          py: 3,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          viewTransitionName: PAGE_CONTENT_TRANSITION,
        }}
      >
        <Alert severity="info" sx={{ mb: 3 }}>
          Demo environment with 10,000 generated employees. Changes are saved and seen by everyone
          who uses this demo.
        </Alert>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <ToastProvider>
            <Outlet />
          </ToastProvider>
        </LocalizationProvider>
      </Container>
    </Box>
  );
}
