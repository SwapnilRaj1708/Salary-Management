import type { AuthUser } from '@salary/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './client.ts';
import { createQueryClient, meQuery } from './queries.ts';

describe('createQueryClient', () => {
  it('forgets the user and reports it when any request comes back 401', async () => {
    const onUnauthenticated = vi.fn();
    const client = createQueryClient(onUnauthenticated);
    const user: AuthUser = { id: 1, email: 'admin@acme.example' };
    client.setQueryData(meQuery.queryKey, user);

    await client
      .fetchQuery({
        queryKey: ['employees'],
        queryFn: () => Promise.reject(new ApiError(401, 'UNAUTHENTICATED', 'Sign in')),
      })
      .catch(() => {});

    expect(onUnauthenticated).toHaveBeenCalledOnce();
    expect(client.getQueryData(meQuery.queryKey)).toBeNull();
  });

  it('leaves other failures to the screen that made the request', async () => {
    const onUnauthenticated = vi.fn();
    const client = createQueryClient(onUnauthenticated);

    await client
      .fetchQuery({
        queryKey: ['employees'],
        queryFn: () => Promise.reject(new ApiError(500, 'INTERNAL', 'Oops')),
        retry: false,
      })
      .catch(() => {});

    expect(onUnauthenticated).not.toHaveBeenCalled();
  });
});
