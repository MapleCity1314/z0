import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getEnv, loadApiEnv } from "./env";

const tempDirs: string[] = [];

function createTempRoot() {
  const root = mkdtempSync(join(tmpdir(), "z0-api-env-"));
  tempDirs.push(root);
  return root;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe("loadApiEnv", () => {
  it("loads workspace root env files for the api runtime", () => {
    const workspaceRoot = createTempRoot();
    const packageRoot = join(workspaceRoot, "apps/api");

    writeFileSync(
      join(workspaceRoot, ".env"),
      [
        "DATABASE_URL=postgres://root-env",
        "API_NAME=@z0/api-root",
        'API_BASE_URL="http://localhost:3001"',
      ].join("\n"),
    );
    writeFileSync(
      join(workspaceRoot, ".env.local"),
      ["API_VERSION=9.9.9", "SUPABASE_URL=https://example.supabase.co"].join(
        "\n",
      ),
    );

    const env: NodeJS.ProcessEnv = {};
    loadApiEnv(env, { packageRoot, workspaceRoot });

    expect(getEnv(env)).toMatchObject({
      API_BASE_URL: "http://localhost:3001",
      API_NAME: "@z0/api-root",
      API_VERSION: "9.9.9",
      DATABASE_URL: "postgres://root-env",
      SUPABASE_URL: "https://example.supabase.co",
    });
  });

  it("does not override explicit process env values", () => {
    const workspaceRoot = createTempRoot();
    const packageRoot = join(workspaceRoot, "apps/api");

    writeFileSync(join(workspaceRoot, ".env"), "DATABASE_URL=postgres://root");

    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: "postgres://shell",
    };

    loadApiEnv(env, { packageRoot, workspaceRoot });

    expect(env.DATABASE_URL).toBe("postgres://shell");
  });
});
