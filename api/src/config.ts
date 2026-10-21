import { z } from 'zod';

const Env = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  // Render sets this to the deployed commit; locally there is none.
  RENDER_GIT_COMMIT: z.string().min(1).optional(),
});

export type Config = {
  port: number;
  version: string;
};

/** Reads and validates the environment once at boot. Invalid config stops the process. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = Env.parse(env);
  return {
    port: parsed.PORT,
    version: parsed.RENDER_GIT_COMMIT ?? 'dev',
  };
}
