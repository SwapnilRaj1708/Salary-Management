import {
  createRootRoute,
  createRoute,
  createRouter,
  type RouterHistory,
  redirect,
} from '@tanstack/react-router';
import { AppShell } from './app/AppShell.tsx';
import { EmployeesPage } from './features/employees/EmployeesPage.tsx';
import { InsightsPage } from './features/insights/InsightsPage.tsx';

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/employees' });
  },
});

const employeesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/employees',
  component: EmployeesPage,
});

const insightsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/insights',
  component: InsightsPage,
});

const routeTree = rootRoute.addChildren([indexRoute, employeesRoute, insightsRoute]);

/** Tests pass a memory history; the browser uses the default. */
export function createAppRouter({ history }: { history?: RouterHistory } = {}) {
  return createRouter({ routeTree, ...(history ? { history } : {}) });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
