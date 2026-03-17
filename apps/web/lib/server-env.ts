import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type EnvRoots = {
  packageRoot?: string;
  workspaceRoot?: string;
};

function getDefaultRoots(): Required<EnvRoots> {
  const packageRoot = process.cwd();

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

export function loadWebEnv(
  env: NodeJS.ProcessEnv = process.env,
  roots: EnvRoots = getDefaultRoots(),
) {
  const packageRoot = roots.packageRoot ?? getDefaultRoots().packageRoot;
  const workspaceRoot = roots.workspaceRoot ?? getDefaultRoots().workspaceRoot;
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

    const entries = parseEnvFile(readFileSync(filePath, "utf8"));

    for (const [key, value] of Object.entries(entries)) {
      if (typeof env[key] === "undefined") {
        env[key] = value;
      }
    }
  }

  return env;
}

loadWebEnv();
