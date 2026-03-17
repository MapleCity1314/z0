import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

type EnvRoots = {
  packageRoot?: string;
  workspaceRoot?: string;
};

function getDefaultRoots(): Required<EnvRoots> {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

  return {
    packageRoot,
    workspaceRoot: resolve(packageRoot, "../.."),
  };
}

function parseEnvFile(content: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u,
    );

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      const quote = value[0];
      value = value.slice(1, -1);

      if (quote === '"') {
        value = value
          .replaceAll("\\n", "\n")
          .replaceAll("\\r", "\r")
          .replaceAll("\\t", "\t")
          .replaceAll('\\"', '"')
          .replaceAll("\\\\", "\\");
      }
    } else {
      value = value.replace(/\s+#.*$/u, "").trim();
    }

    entries[key] = value;
  }

  return entries;
}

export function loadApiEnv(
  env: NodeJS.ProcessEnv = process.env,
  roots: EnvRoots = getDefaultRoots(),
) {
  const workspaceRoot = roots.workspaceRoot ?? getDefaultRoots().workspaceRoot;
  const packageRoot = roots.packageRoot ?? getDefaultRoots().packageRoot;
  const mergedEntries: Record<string, string> = {};
  const envFiles = [
    resolve(workspaceRoot, ".env"),
    resolve(workspaceRoot, ".env.local"),
    resolve(packageRoot, ".env"),
    resolve(packageRoot, ".env.local"),
  ];

  for (const filePath of envFiles) {
    if (!existsSync(filePath)) {
      continue;
    }

    Object.assign(mergedEntries, parseEnvFile(readFileSync(filePath, "utf8")));
  }

  for (const [key, value] of Object.entries(mergedEntries)) {
    if (typeof env[key] === "undefined") {
      env[key] = value;
    }
  }

  return env;
}

loadApiEnv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_NAME: z.string().default("@z0/api"),
  API_VERSION: z.string().default("0.1.0"),
  API_BASE_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SANDBOX_CLI_PATH: z.string().optional(),
  SANDBOX_WORKDIR: z.string().optional(),
});

export type ApiEnv = z.infer<typeof envSchema>;

export function getEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  loadApiEnv(env);
  return envSchema.parse(env);
}
