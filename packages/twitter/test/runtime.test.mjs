import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
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
});
