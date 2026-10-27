import {
  type AuthUser,
  type EmployeeFilters,
  EmployeeListResponse,
  type LoginRequest,
  MeResponse,
  ReferenceDataResponse,
} from '@salary/shared';
import {
  keepPreviousData,
  MutationCache,
  QueryCache,
  QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, apiNoContent, isUnauthenticated } from './client.ts';

/**
 * The query client. When any request comes back 401 (an expired session), it forgets the
 * user and calls `onUnauthenticated`, which sends them to the login page.
 */
export function createQueryClient(onUnauthenticated: () => void = () => {}): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isUnauthenticated(error) && query.queryKey[0] !== 'me') handle();
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (isUnauthenticated(error) && mutation.options.mutationKey?.[0] !== 'login') handle();
      },
    }),
    defaultOptions: {
      queries: { retry: (count, error) => !isUnauthenticated(error) && count < 2 },
    },
  });
  function handle() {
    client.setQueryData(meQuery.queryKey, null);
    onUnauthenticated();
  }
  return client;
}

/** The signed-in user, or null when nobody is signed in. */
export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: async (): Promise<AuthUser | null> => {
    try {
      return (await api('/auth/me', MeResponse)).user;
    } catch (error) {
      if (isUnauthenticated(error)) return null;
      throw error;
    }
  },
  staleTime: Number.POSITIVE_INFINITY,
});

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['login'],
    mutationFn: (credentials: LoginRequest) =>
      api('/auth/login', MeResponse, { method: 'POST', body: credentials }),
    onSuccess: ({ user }) => queryClient.setQueryData(meQuery.queryKey, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['logout'],
    mutationFn: () => apiNoContent('/auth/logout'),
    // Whatever the server said, this tab forgets everything it knew.
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(meQuery.queryKey, null);
    },
  });
}

/** One page of the directory. While the next page loads, the previous one stays on screen. */
export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: () => api(`/employees?${toQueryString(filters)}`, EmployeeListResponse),
    placeholderData: keepPreviousData,
  });
}

/** Departments and job titles for filters and forms. They change only with a deploy. */
export function useReferenceData() {
  return useQuery({
    queryKey: ['reference-data'],
    queryFn: () => api('/reference-data', ReferenceDataResponse),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

function toQueryString(filters: EmployeeFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}
