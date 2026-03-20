#!/usr/bin/env node

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = resolve(packageRoot, "artifacts");

mkdirSync(artifactsDir, { recursive: true });

const result = spawnSync("pnpm", ["pack", "--pack-destination", artifactsDir], {
  cwd: packageRoot,
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
