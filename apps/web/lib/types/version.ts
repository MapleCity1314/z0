import type { VersionUpdate } from "@/lib/schema";

/**
 * Version type enum
 */
export type VersionType = "major" | "minor" | "patch";

/**
 * Version status enum
 */
export type VersionStatus = "draft" | "published" | "archived";

/**
 * Changelog item
 */
export interface ChangelogItem {
  title: string;
  description?: string;
}

/**
 * Version changelog
 */
export interface VersionChangelog {
  features: ChangelogItem[];
  improvements: ChangelogItem[];
  bugFixes: ChangelogItem[];
  breaking: ChangelogItem[];
}

/**
 * Version creation input
 */
export interface CreateVersionInput {
  version: string;
  title: string;
  description?: string;
  type: VersionType;
  features?: ChangelogItem[];
  improvements?: ChangelogItem[];
  bugFixes?: ChangelogItem[];
  breaking?: ChangelogItem[];
  highlights?: string[];
  migration?: string;
  downloadUrl?: string;
  docsUrl?: string;
}

/**
 * Version update input
 */
export interface UpdateVersionInput {
  title?: string;
  description?: string;
  features?: ChangelogItem[];
  improvements?: ChangelogItem[];
  bugFixes?: ChangelogItem[];
  breaking?: ChangelogItem[];
  highlights?: string[];
  migration?: string;
  downloadUrl?: string;
  docsUrl?: string;
}

/**
 * Version with statistics
 */
export interface VersionWithStats extends VersionUpdate {
  totalChanges: number;
  hasBreakingChanges: boolean;
  daysAgo?: number;
}

/**
 * Version comparison
 */
export interface VersionComparison {
  from: string;
  to: string;
  type: VersionType;
  changes: VersionChangelog;
  highlights: string[];
  breaking: ChangelogItem[];
}

/**
 * Semantic version
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/**
 * Parse semantic version string
 */
export function parseVersion(version: string): SemanticVersion | null {
  const regex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
  const match = version.match(regex);

  if (!match) return null;

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    prerelease: match[4],
    build: match[5],
  };
}

/**
 * Compare two versions
 */
export function compareVersions(a: string, b: string): number {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);

  if (!versionA || !versionB) return 0;

  if (versionA.major !== versionB.major) {
    return versionA.major - versionB.major;
  }

  if (versionA.minor !== versionB.minor) {
    return versionA.minor - versionB.minor;
  }

  if (versionA.patch !== versionB.patch) {
    return versionA.patch - versionB.patch;
  }

  return 0;
}

/**
 * Get version type from comparison
 */
export function getVersionType(from: string, to: string): VersionType {
  const versionFrom = parseVersion(from);
  const versionTo = parseVersion(to);

  if (!versionFrom || !versionTo) return "patch";

  if (versionTo.major > versionFrom.major) return "major";
  if (versionTo.minor > versionFrom.minor) return "minor";
  return "patch";
}
