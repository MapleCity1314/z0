import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_NAME: z.string().default("@z0/api"),
  API_VERSION: z.string().default("0.1.0"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SANDBOX_CLI_PATH: z.string().optional(),
  SANDBOX_WORKDIR: z.string().optional(),
});

export type ApiEnv = z.infer<typeof envSchema>;

export function getEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  return envSchema.parse(env);
}
