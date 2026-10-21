import { z } from 'zod';

/**
 * Body of `GET /api/health`.
 *
 * Response contracts are not `.strict()`: an open tab can be older than the API, so fields a
 * newer API adds must not break it (zod strips them). Request schemas stay `.strict()`.
 */
export const HealthResponse = z.object({
  status: z.literal('ok'),
  version: z.string().min(1),
  apiVersion: z.number().int().positive(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
