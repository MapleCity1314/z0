#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stageNativeBinary } from "../bin/native-runtime.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(packageRoot, "native", "Cargo.toml");
const profile = process.argv.includes("--debug") ? "debug" : "release";
const skipBuild = process.argv.includes("--skip-build");
const targetIndex = process.argv.indexOf("--target");
const platformIndex = process.argv.indexOf("--platform");
const archIndex = process.argv.indexOf("--arch");
const target = targetIndex === -1 ? null : process.argv[targetIndex + 1];
const platform = platformIndex === -1 ? process.platform : process.argv[platformIndex + 1];
const arch = archIndex === -1 ? process.arch : process.argv[archIndex + 1];

const cargoArgs = ["build", "--manifest-path", manifestPath, "--bin", "z0-twitter-cli"];
if (profile === "release") {
  cargoArgs.push("--release");
}

if (target) {
  cargoArgs.push("--target", target);
}

if (!skipBuild) {
  const result = spawnSync("cargo", cargoArgs, {
    cwd: packageRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const stagedPath = stageNativeBinary(packageRoot, { profile, platform, arch, target });
process.stdout.write(`${stagedPath}\n`);
