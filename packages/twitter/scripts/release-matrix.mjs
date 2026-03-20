#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(packageRoot, "native", "Cargo.toml");

const knownTargets = {
  "darwin-arm64": { target: "aarch64-apple-darwin", platform: "darwin", arch: "arm64" },
  "darwin-x64": { target: "x86_64-apple-darwin", platform: "darwin", arch: "x64" },
  "linux-arm64": { target: "aarch64-unknown-linux-gnu", platform: "linux", arch: "arm64" },
  "linux-x64": { target: "x86_64-unknown-linux-gnu", platform: "linux", arch: "x64" },
  "win32-x64": { target: "x86_64-pc-windows-msvc", platform: "win32", arch: "x64" },
};

const requestedKeys = (process.env.Z0_TWITTER_RELEASE_TARGETS || `${process.platform}-${process.arch}`)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

for (const key of requestedKeys) {
  const config = knownTargets[key];

  if (!config) {
    process.stderr.write(`Unknown release target key: ${key}\n`);
    process.exit(1);
  }

  const buildResult = spawnSync(
    "cargo",
    ["build", "--manifest-path", manifestPath, "--bin", "z0-twitter-cli", "--release", "--target", config.target],
    {
      cwd: packageRoot,
      stdio: "inherit",
      env: process.env,
    },
  );

  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1);
  }

  const stageResult = spawnSync(
    "node",
    [
      "./scripts/build-native.mjs",
      "--target",
      config.target,
      "--platform",
      config.platform,
      "--arch",
      config.arch,
      "--skip-build",
    ],
    {
      cwd: packageRoot,
      stdio: "inherit",
      env: process.env,
    },
  );

  if (stageResult.status !== 0) {
    process.exit(stageResult.status ?? 1);
  }
}
