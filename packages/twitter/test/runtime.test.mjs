import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { readArtifactManifest, stageNativeBinary } from "../bin/native-runtime.mjs";
import { executeTwitterCommand, resolveTwitterCommand } from "../bin/runtime.mjs";
import { selfCheckTwitterRuntime } from "../bin/runtime.mjs";

function createPackageRoot() {
  return mkdtempSync(resolve(tmpdir(), "z0-twitter-"));
}

test("resolveTwitterCommand prefers an explicit binary", () => {
  const packageRoot = createPackageRoot();
  const customBin = resolve(packageRoot, "bin", "twitter");

  mkdirSync(resolve(packageRoot, "bin"), { recursive: true });
  writeFileSync(customBin, "#!/bin/sh\nprintf '{\"ok\":true}'\n", "utf8");
  chmodSync(customBin, 0o755);

  const resolved = resolveTwitterCommand(packageRoot, { Z0_TWITTER_BIN: customBin });
  assert.equal(resolved.command, customBin);
});

test("resolveTwitterCommand falls back to python module execution", () => {
  const packageRoot = createPackageRoot();
  const sourceRoot = resolve(packageRoot, "legacy");

  mkdirSync(sourceRoot, { recursive: true });

  const resolved = resolveTwitterCommand(packageRoot, {
    PATH: "",
    Z0_TWITTER_SOURCE_ROOT: sourceRoot,
    Z0_TWITTER_PYTHON_BIN: "python-custom",
  });
  assert.equal(resolved.command, "python-custom");
  assert.deepEqual(resolved.args, ["-m", "twitter_cli.cli"]);
  assert.equal(resolved.cwd, sourceRoot);
});

test("executeTwitterCommand parses JSON stdout", () => {
  const packageRoot = createPackageRoot();
  const customBin = resolve(packageRoot, "bin", "twitter");

  mkdirSync(resolve(packageRoot, "bin"), { recursive: true });
  writeFileSync(customBin, "#!/bin/sh\nprintf '{\"ok\":true,\"data\":{\"id\":\"1\"}}'\n", "utf8");
  chmodSync(customBin, 0o755);

  const result = executeTwitterCommand(packageRoot, ["status", "--json"], {
    Z0_TWITTER_BIN: customBin,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.id, "1");
});

test("selfCheckTwitterRuntime reports a structured failure when unresolved", () => {
  const packageRoot = createPackageRoot();
  const result = selfCheckTwitterRuntime(packageRoot, { PATH: "" });

  assert.equal(result.ok, false);
  assert.equal(result.legacyRootPresent, false);
  assert.deepEqual(result.packagedArtifacts, []);
});

test("stageNativeBinary writes a manifest entry", () => {
  const packageRoot = createPackageRoot();
  const cargoBin = resolve(packageRoot, "native", "target", "release", "z0-twitter-cli");

  mkdirSync(resolve(packageRoot, "native", "target", "release"), { recursive: true });
  writeFileSync(cargoBin, "twitter-native", "utf8");
  chmodSync(cargoBin, 0o755);

  const staged = stageNativeBinary(packageRoot, { profile: "release" });
  const manifest = readArtifactManifest(packageRoot);
  const manifestPath = resolve(packageRoot, "dist", "native", "manifest.json");

  assert.equal(staged, resolve(packageRoot, "dist", "native", `${process.platform}-${process.arch}`, "z0-twitter-cli"));
  assert.equal(manifest.artifacts.length, 1);
  assert.equal(manifest.artifacts[0].artifactKey, `${process.platform}-${process.arch}`);
  assert.equal(JSON.parse(readFileSync(manifestPath, "utf8")).binaryName, "z0-twitter-cli");
});
