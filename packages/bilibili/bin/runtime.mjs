import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { delimiter, resolve } from "node:path";

function ensureAbsolutePath(basePath, inputPath) {
  if (!inputPath) {
    return null;
  }

  return inputPath.startsWith("/") ? inputPath : resolve(basePath, inputPath);
}

function commandExists(commandName) {
  const pathValue = process.env.PATH || "";
  const pathExtValue = process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM";
  const executableSuffixes =
    process.platform === "win32" ? pathExtValue.split(";").filter(Boolean) : [""];

  return pathValue.split(delimiter).some((entry) =>
    executableSuffixes.some((suffix) => existsSync(resolve(entry, `${commandName}${suffix.toLowerCase()}`))),
  );
}

export function resolveBilibiliCommand(packageRoot, env = process.env) {
  const explicitBin = ensureAbsolutePath(process.cwd(), env.Z0_BILIBILI_BIN);

  if (explicitBin && existsSync(explicitBin)) {
    return { command: explicitBin, args: [], cwd: packageRoot };
  }

  const sourceRoot = ensureAbsolutePath(packageRoot, env.Z0_BILIBILI_SOURCE_ROOT ?? "../bilibili-cli");

  if (sourceRoot && existsSync(sourceRoot) && commandExists("uv")) {
    return {
      command: "uv",
      args: ["run", "--project", sourceRoot, "bili"],
      cwd: packageRoot,
    };
  }

  if (sourceRoot && existsSync(sourceRoot)) {
    return {
      command: env.Z0_BILIBILI_PYTHON_BIN || "python3",
      args: ["-m", "bili_cli.cli"],
      cwd: sourceRoot,
    };
  }

  throw new Error(
    "Bilibili CLI bridge was not found. Set `Z0_BILIBILI_BIN` or make `packages/bilibili-cli` available.",
  );
}

export function executeBilibiliCommand(packageRoot, cliArgs, env = process.env) {
  let resolved;

  try {
    resolved = resolveBilibiliCommand(packageRoot, env);
  } catch (error) {
    return {
      error: true,
      message: error instanceof Error ? error.message : String(error),
      status: 1,
    };
  }

  const result = spawnSync(resolved.command, [...resolved.args, ...cliArgs], {
    cwd: resolved.cwd,
    encoding: "utf8",
    env,
  });

  if (result.status !== 0) {
    return {
      error: true,
      message: (result.stderr || result.stdout || "").trim() || "bilibili-cli execution failed",
      status: result.status ?? 1,
    };
  }

  const stdout = (result.stdout || "").trim();

  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, rawText: stdout };
  }
}

export function selfCheckBilibiliRuntime(packageRoot, env = process.env) {
  const sourceRoot = ensureAbsolutePath(packageRoot, env.Z0_BILIBILI_SOURCE_ROOT ?? "../bilibili-cli");
  const explicitBin = ensureAbsolutePath(process.cwd(), env.Z0_BILIBILI_BIN);
  const uvAvailable = commandExists("uv");

  try {
    const resolved = resolveBilibiliCommand(packageRoot, env);
    return {
      ok: true,
      resolution: resolved,
      explicitBinPresent: Boolean(explicitBin && existsSync(explicitBin)),
      legacyRootPresent: Boolean(sourceRoot && existsSync(sourceRoot)),
      uvAvailable,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      explicitBinPresent: Boolean(explicitBin && existsSync(explicitBin)),
      legacyRootPresent: Boolean(sourceRoot && existsSync(sourceRoot)),
      uvAvailable,
    };
  }
}
