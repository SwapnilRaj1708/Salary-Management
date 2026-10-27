import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { meQuery, useLogout } from '../api/queries.ts';
import { ButtonLink } from './ButtonLink.tsx';
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

  return (
    <>
      <ViewTransitionStyles />
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 3 }}>
          <Typography variant="h6" component="span">
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
              <Typography variant="body2" color="text.secondary">
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
        sx={{ py: 3, viewTransitionName: PAGE_CONTENT_TRANSITION }}
      >
        <Alert severity="info" sx={{ mb: 3 }}>
          Demo environment with 10,000 generated employees. Changes are saved and seen by everyone
          who uses this demo.
        </Alert>
        <Outlet />
      </Container>
    </>
  );
}
