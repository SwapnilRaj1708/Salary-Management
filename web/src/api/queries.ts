import { type AuthUser, type LoginRequest, MeResponse } from '@salary/shared';
import {
  MutationCache,
  QueryCache,
  QueryClient,
  queryOptions,
  useMutation,
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
