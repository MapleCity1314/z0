import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { executeBilibiliCommand, resolveBilibiliCommand } from "../bin/runtime.mjs";
import { selfCheckBilibiliRuntime } from "../bin/runtime.mjs";

function createPackageRoot() {
  return mkdtempSync(resolve(tmpdir(), "z0-bilibili-"));
}

test("resolveBilibiliCommand prefers an explicit binary", () => {
  const packageRoot = createPackageRoot();
  const customBin = resolve(packageRoot, "bin", "bili");

  mkdirSync(resolve(packageRoot, "bin"), { recursive: true });
  writeFileSync(customBin, "#!/bin/sh\nprintf '{\"ok\":true}'\n", "utf8");
  chmodSync(customBin, 0o755);

  const resolved = resolveBilibiliCommand(packageRoot, { Z0_BILIBILI_BIN: customBin });
  assert.equal(resolved.command, customBin);
});

test("resolveBilibiliCommand falls back to python module execution", () => {
  const packageRoot = createPackageRoot();
  const sourceRoot = resolve(packageRoot, "legacy");

  mkdirSync(sourceRoot, { recursive: true });

  const resolved = resolveBilibiliCommand(packageRoot, {
    PATH: "",
    Z0_BILIBILI_SOURCE_ROOT: sourceRoot,
    Z0_BILIBILI_PYTHON_BIN: "python-custom",
  });
  assert.equal(resolved.command, "python-custom");
  assert.deepEqual(resolved.args, ["-m", "bili_cli.cli"]);
  assert.equal(resolved.cwd, sourceRoot);
});

test("executeBilibiliCommand parses JSON stdout", () => {
  const packageRoot = createPackageRoot();
  const customBin = resolve(packageRoot, "bin", "bili");

  mkdirSync(resolve(packageRoot, "bin"), { recursive: true });
  writeFileSync(customBin, "#!/bin/sh\nprintf '{\"ok\":true,\"data\":{\"id\":\"BV1\"}}'\n", "utf8");
  chmodSync(customBin, 0o755);

  const result = executeBilibiliCommand(packageRoot, ["status", "--json"], {
    Z0_BILIBILI_BIN: customBin,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.id, "BV1");
});

test("selfCheckBilibiliRuntime reports a structured failure when unresolved", () => {
  const packageRoot = createPackageRoot();
  const result = selfCheckBilibiliRuntime(packageRoot, { PATH: "" });

  assert.equal(result.ok, false);
  assert.equal(result.legacyRootPresent, false);
});
