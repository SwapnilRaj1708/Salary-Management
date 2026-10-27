import { z } from 'zod';

/** Body of `POST /api/auth/login`. Request schemas are strict: unknown fields are rejected. */
export const LoginRequest = z
  .object({
    email: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(200),
  })
  .strict();

export type LoginRequest = z.infer<typeof LoginRequest>;

export const AuthUser = z.object({
  id: z.number().int().positive(),
  email: z.string().min(1),
});

export type AuthUser = z.infer<typeof AuthUser>;

/** Body of `POST /api/auth/login` and `GET /api/auth/me`. */
export const MeResponse = z.object({ user: AuthUser });

export type MeResponse = z.infer<typeof MeResponse>;
