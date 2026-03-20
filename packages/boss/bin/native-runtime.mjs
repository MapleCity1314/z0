import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function binaryNameForPlatform(platform = process.platform) {
  return platform === "win32" ? "z0-boss-cli.exe" : "z0-boss-cli";
}

function artifactKey(platform = process.platform, arch = process.arch) {
  return `${platform}-${arch}`;
}

function normalizeArtifactManifest(manifest) {
  const artifacts = Array.isArray(manifest?.artifacts)
    ? manifest.artifacts
    : manifest?.artifactKey
      ? [
          {
            artifactKey: manifest.artifactKey,
            binaryName: manifest.binaryName ?? null,
            platform: manifest.platform ?? null,
            arch: manifest.arch ?? null,
            profile: manifest.profile ?? null,
            stagedAt: manifest.stagedAt ?? null,
          },
        ]
      : [];

  return {
    binaryName: manifest?.binaryName ?? null,
    artifacts,
  };
}

export function readArtifactManifest(packageRoot) {
  const manifestPath = resolve(packageRoot, "dist", "native", "manifest.json");

  if (!existsSync(manifestPath)) {
    return normalizeArtifactManifest(null);
  }

  return normalizeArtifactManifest(JSON.parse(readFileSync(manifestPath, "utf8")));
}

function ensureAbsolutePath(basePath, inputPath) {
  if (!inputPath) {
    return null;
  }

  return inputPath.startsWith("/") ? inputPath : resolve(basePath, inputPath);
}

export function getPackagedBinaryPath(packageRoot, options = {}) {
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;

  return resolve(packageRoot, "dist", "native", artifactKey(platform, arch), binaryNameForPlatform(platform));
}

export function getCargoBinaryPath(packageRoot, options = {}) {
  const platform = options.platform ?? process.platform;
  const profile = options.profile ?? "release";
  const target = options.target ?? null;

  return target
    ? resolve(packageRoot, "native", "target", target, profile, binaryNameForPlatform(platform))
    : resolve(packageRoot, "native", "target", profile, binaryNameForPlatform(platform));
}

export function resolveNativeBinary(packageRoot, env = process.env) {
  const overridePath = ensureAbsolutePath(process.cwd(), env.Z0_BOSS_CLI_BIN);
  const candidates = [
    overridePath,
    getPackagedBinaryPath(packageRoot),
    getCargoBinaryPath(packageRoot, { profile: "release" }),
    getCargoBinaryPath(packageRoot, { profile: "debug" }),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    [
      "No Boss CLI binary was found.",
      "Run `pnpm --filter @z0/boss build` or set `Z0_BOSS_CLI_BIN`.",
      `Looked in: ${candidates.join(", ")}`,
    ].join(" "),
  );
}

export function stageNativeBinary(packageRoot, options = {}) {
  const profile = options.profile ?? "release";
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const target = options.target ?? null;
  const sourcePath = getCargoBinaryPath(packageRoot, { profile, platform, target });

  if (!existsSync(sourcePath)) {
    throw new Error(`Cargo binary not found at ${sourcePath}. Build the native target first.`);
  }

  const destinationPath = getPackagedBinaryPath(packageRoot, { platform, arch });
  mkdirSync(dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);

  const manifestPath = resolve(packageRoot, "dist", "native", "manifest.json");
  const currentManifest = readArtifactManifest(packageRoot);
  const nextArtifact = {
    artifactKey: artifactKey(platform, arch),
    binaryName: binaryNameForPlatform(platform),
    platform,
    arch,
    profile,
    stagedAt: new Date().toISOString(),
  };
  const artifacts = currentManifest.artifacts
    .filter((artifact) => artifact.artifactKey !== nextArtifact.artifactKey)
    .concat(nextArtifact)
    .sort((left, right) => left.artifactKey.localeCompare(right.artifactKey));

  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        binaryName: binaryNameForPlatform(platform),
        artifacts,
      },
      null,
      2,
    ),
    "utf8",
  );

  return destinationPath;
}
