import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  getPackagedBinaryPath,
  readArtifactManifest,
  resolveNativeBinary,
  stageNativeBinary,
} from "../bin/native-runtime.mjs";

function createPackageRoot() {
  return mkdtempSync(resolve(tmpdir(), "z0-boss-"));
}

test("resolveNativeBinary prefers explicit override", () => {
  const packageRoot = createPackageRoot();
  const overridePath = resolve(packageRoot, "custom", "z0-boss-cli");

  mkdirSync(resolve(packageRoot, "custom"), { recursive: true });
  writeFileSync(overridePath, "override", "utf8");

  assert.equal(resolveNativeBinary(packageRoot, { Z0_BOSS_CLI_BIN: overridePath }), overridePath);
});

test("resolveNativeBinary falls back to packaged artifact", () => {
  const packageRoot = createPackageRoot();
  const packagedPath = getPackagedBinaryPath(packageRoot);

  mkdirSync(resolve(packagedPath, ".."), { recursive: true });
  writeFileSync(packagedPath, "binary", "utf8");

  assert.equal(resolveNativeBinary(packageRoot, {}), packagedPath);
});

test("stageNativeBinary copies the cargo output and writes a manifest", () => {
  const packageRoot = createPackageRoot();
  const cargoBinaryPath = resolve(packageRoot, "native", "target", "release", "z0-boss-cli");

  mkdirSync(resolve(cargoBinaryPath, ".."), { recursive: true });
  writeFileSync(cargoBinaryPath, "release-binary", "utf8");

  const stagedPath = stageNativeBinary(packageRoot, { profile: "release" });
  const manifest = JSON.parse(readFileSync(resolve(packageRoot, "dist", "native", "manifest.json"), "utf8"));

  assert.equal(readFileSync(stagedPath, "utf8"), "release-binary");
  assert.equal(manifest.artifacts[0].profile, "release");
  assert.equal(manifest.artifacts[0].artifactKey, `${process.platform}-${process.arch}`);
});

test("readArtifactManifest normalizes legacy single-artifact manifests", () => {
  const packageRoot = createPackageRoot();
  const manifestPath = resolve(packageRoot, "dist", "native", "manifest.json");

  mkdirSync(resolve(packageRoot, "dist", "native"), { recursive: true });
  writeFileSync(
    manifestPath,
    JSON.stringify({
      binaryName: "z0-boss-cli",
      artifactKey: "darwin-arm64",
      platform: "darwin",
      arch: "arm64",
      profile: "release",
    }),
    "utf8",
  );

  const manifest = readArtifactManifest(packageRoot);
  assert.equal(manifest.artifacts.length, 1);
  assert.equal(manifest.artifacts[0].artifactKey, "darwin-arm64");
});
