import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { readArtifactManifest, stageNativeBinary } from "../bin/native-runtime.mjs";
import {
  executeXiaohongshuCommand,
  resolveXiaohongshuCommand,
  selfCheckXiaohongshuRuntime,
} from "../bin/runtime.mjs";

function createPackageRoot() {
  return mkdtempSync(resolve(tmpdir(), "z0-xiaohongshu-"));
}

test("resolveXiaohongshuCommand prefers an explicit binary", () => {
  const packageRoot = createPackageRoot();
  const customBin = resolve(packageRoot, "bin", "xhs");

  mkdirSync(resolve(packageRoot, "bin"), { recursive: true });
  writeFileSync(customBin, "#!/bin/sh\nprintf '{\"ok\":true}'\n", "utf8");
  chmodSync(customBin, 0o755);

  const resolved = resolveXiaohongshuCommand(packageRoot, { Z0_XIAOHONGSHU_BIN: customBin });
  assert.equal(resolved.command, customBin);
});

test("resolveXiaohongshuCommand falls back to python module execution", () => {
  const packageRoot = createPackageRoot();
  const sourceRoot = resolve(packageRoot, "legacy");

  mkdirSync(sourceRoot, { recursive: true });

  const resolved = resolveXiaohongshuCommand(packageRoot, {
    PATH: "",
    Z0_XIAOHONGSHU_SOURCE_ROOT: sourceRoot,
    Z0_XIAOHONGSHU_PYTHON_BIN: "python-custom",
  });
  assert.equal(resolved.command, "python-custom");
  assert.deepEqual(resolved.args, ["-m", "xhs_cli.cli"]);
  assert.equal(resolved.cwd, sourceRoot);
});

test("executeXiaohongshuCommand parses JSON stdout", () => {
  const packageRoot = createPackageRoot();
  const customBin = resolve(packageRoot, "bin", "xhs");

  mkdirSync(resolve(packageRoot, "bin"), { recursive: true });
  writeFileSync(customBin, "#!/bin/sh\nprintf '{\"ok\":true,\"data\":{\"id\":\"note-1\"}}'\n", "utf8");
  chmodSync(customBin, 0o755);

  const result = executeXiaohongshuCommand(packageRoot, ["status", "--json"], {
    Z0_XIAOHONGSHU_BIN: customBin,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.id, "note-1");
});

test("selfCheckXiaohongshuRuntime reports a structured failure when unresolved", () => {
  const packageRoot = createPackageRoot();
  const result = selfCheckXiaohongshuRuntime(packageRoot, { PATH: "" });

  assert.equal(result.ok, false);
  assert.equal(result.legacyRootPresent, false);
  assert.deepEqual(result.packagedArtifacts, []);
});

test("stageNativeBinary writes a manifest entry", () => {
  const packageRoot = createPackageRoot();
  const cargoBin = resolve(packageRoot, "native", "target", "release", "z0-xiaohongshu-cli");

  mkdirSync(resolve(packageRoot, "native", "target", "release"), { recursive: true });
  writeFileSync(cargoBin, "xiaohongshu-native", "utf8");
  chmodSync(cargoBin, 0o755);

  const staged = stageNativeBinary(packageRoot, { profile: "release" });
  const manifest = readArtifactManifest(packageRoot);
  const manifestPath = resolve(packageRoot, "dist", "native", "manifest.json");

  assert.equal(
    staged,
    resolve(packageRoot, "dist", "native", `${process.platform}-${process.arch}`, "z0-xiaohongshu-cli"),
  );
  assert.equal(manifest.artifacts.length, 1);
  assert.equal(manifest.artifacts[0].artifactKey, `${process.platform}-${process.arch}`);
  assert.equal(JSON.parse(readFileSync(manifestPath, "utf8")).binaryName, "z0-xiaohongshu-cli");
});
