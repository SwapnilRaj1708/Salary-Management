import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  type RouterHistory,
  redirect,
  stripSearchParams,
} from '@tanstack/react-router';
import { z } from 'zod';
import { meQuery } from './api/queries.ts';
import { AppShell } from './app/AppShell.tsx';
import { pageTransitionTypes } from './app/pageTransition.ts';
import { LoginPage, safeRedirect } from './features/auth/LoginPage.tsx';
import { DIRECTORY_DEFAULTS, DirectorySearch } from './features/employees/search.ts';
import { InsightsPage } from './features/insights/InsightsPage.tsx';

export type RouterContext = { queryClient: QueryClient };

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet });

// A bad or missing redirect param falls back to the default instead of an error page.
const LoginSearch = z.object({ redirect: z.string().optional().catch(undefined) });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: LoginSearch,
  beforeLoad: async ({ context, search }) => {
    if (await context.queryClient.ensureQueryData(meQuery)) {
      throw redirect({ href: safeRedirect(search.redirect) });
    }
  },
  component: function Login() {
    return <LoginPage redirect={loginRoute.useSearch().redirect} />;
  },
});

/** Every page except login sits under this layout, which requires a signed-in user. */
const signedInRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'signed-in',
  beforeLoad: async ({ context, location }) => {
    if (!(await context.queryClient.ensureQueryData(meQuery))) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => signedInRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/employees' });
  },
});

const employeesRoute = createRoute({
  getParentRoute: () => signedInRoute,
  path: '/employees',
  validateSearch: DirectorySearch,
  search: { middlewares: [stripSearchParams(DIRECTORY_DEFAULTS)] },
  // Lazy-loaded: the Data Grid is the heaviest part of the bundle (decision D7).
  component: lazyRouteComponent(
    () => import('./features/employees/EmployeesPage.tsx'),
    'EmployeesPage',
  ),
});

const insightsRoute = createRoute({
  getParentRoute: () => signedInRoute,
  path: '/insights',
  component: InsightsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  signedInRoute.addChildren([indexRoute, employeesRoute, insightsRoute]),
]);

/** Tests pass a memory history; the browser uses the default. */
export function createAppRouter({
  queryClient,
  history,
}: {
  queryClient: QueryClient;
  history?: RouterHistory;
}) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultViewTransition: { types: pageTransitionTypes },
    ...(history ? { history } : {}),
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
