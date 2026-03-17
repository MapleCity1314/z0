import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadWebEnv } from "./server-env";

const tempDirs: string[] = [];

function createTempRoot() {
  const root = mkdtempSync(join(tmpdir(), "z0-web-env-"));
  tempDirs.push(root);
  return root;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe("loadWebEnv", () => {
  it("loads workspace root env files for the web runtime", () => {
    const workspaceRoot = createTempRoot();
    const packageRoot = join(workspaceRoot, "apps/web");

    writeFileSync(
      join(workspaceRoot, ".env"),
      [
        "DATABASE_URL=postgres://root-env",
        'BETTER_AUTH_URL="http://localhost:3000"',
      ].join("\n"),
    );
    writeFileSync(
      join(workspaceRoot, ".env.local"),
      ["API_BASE_URL=http://localhost:3001", "AGENT_BRIDGE_TOKEN=bridge"].join(
        "\n",
      ),
    );

    const env = {} as NodeJS.ProcessEnv;
    loadWebEnv(env, { packageRoot, workspaceRoot });

    expect(env).toMatchObject({
      AGENT_BRIDGE_TOKEN: "bridge",
      API_BASE_URL: "http://localhost:3001",
      BETTER_AUTH_URL: "http://localhost:3000",
      DATABASE_URL: "postgres://root-env",
    });
  });

  it("preserves explicit process env values", () => {
    const workspaceRoot = createTempRoot();
    const packageRoot = join(workspaceRoot, "apps/web");

    writeFileSync(join(workspaceRoot, ".env"), "DATABASE_URL=postgres://root");

    const env = {
      DATABASE_URL: "postgres://shell",
    } as unknown as NodeJS.ProcessEnv;

    loadWebEnv(env, { packageRoot, workspaceRoot });

    expect(env.DATABASE_URL).toBe("postgres://shell");
  });
});
