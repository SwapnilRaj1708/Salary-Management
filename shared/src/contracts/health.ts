import { z } from 'zod';

/** Body of `GET /api/health`. The web app also parses it while waiting for the server to wake. */
export const HealthResponse = z
  .object({
    status: z.literal('ok'),
    version: z.string().min(1),
    apiVersion: z.number().int().positive(),
  })
  .strict();

export type HealthResponse = z.infer<typeof HealthResponse>;
