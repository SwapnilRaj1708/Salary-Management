import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Outlet } from '@tanstack/react-router';
import { ButtonLink } from './ButtonLink.tsx';
import { PAGE_CONTENT_TRANSITION, ViewTransitionStyles } from './ViewTransitionStyles.tsx';

const navLinkSx = {
  color: 'text.secondary',
  '&[aria-current="page"]': { color: 'primary.main', bgcolor: 'action.selected' },
} as const;

export function AppShell() {
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
        </Toolbar>
      </AppBar>
      <Container
        component="main"
        maxWidth="xl"
        sx={{ py: 3, viewTransitionName: PAGE_CONTENT_TRANSITION }}
      >
        <Alert severity="info" sx={{ mb: 3 }}>
          Demo environment: data resets to the seeded 10,000 employees whenever the free server
          sleeps.
        </Alert>
        <Outlet />
      </Container>
    </>
  );
}
