import { db } from "./index";
import { versionUpdate, type VersionUpdate } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

interface ChangelogItem {
  title: string;
  description?: string;
}

/**
 * Create version update
 */
export async function createVersionUpdate(data: {
  version: string;
  title: string;
  description?: string;
  type: "major" | "minor" | "patch";
  features?: ChangelogItem[];
  improvements?: ChangelogItem[];
  bugFixes?: ChangelogItem[];
  breaking?: ChangelogItem[];
  highlights?: string[];
  migration?: string;
  publishedBy?: string;
  downloadUrl?: string;
  docsUrl?: string;
}) {
  const now = new Date();

  const [newVersion] = await db
    .insert(versionUpdate)
    .values({
      version: data.version,
      title: data.title,
      description: data.description,
      type: data.type,
      features: data.features || [],
      improvements: data.improvements || [],
      bugFixes: data.bugFixes || [],
      breaking: data.breaking || [],
      highlights: data.highlights || [],
      migration: data.migration,
      status: "draft",
      isLatest: "false",
      publishedBy: data.publishedBy,
      downloadUrl: data.downloadUrl,
      docsUrl: data.docsUrl,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return newVersion;
}

/**
 * Get version by ID
 */
export async function getVersionById(versionId: string): Promise<VersionUpdate | null> {
  const [result] = await db
    .select()
    .from(versionUpdate)
    .where(eq(versionUpdate.id, versionId))
    .limit(1);

  return result || null;
}

/**
 * Get version by version number
 */
export async function getVersionByNumber(version: string): Promise<VersionUpdate | null> {
  const [result] = await db
    .select()
    .from(versionUpdate)
    .where(eq(versionUpdate.version, version))
    .limit(1);

  return result || null;
}

/**
 * Get latest version
 */
export async function getLatestVersion(): Promise<VersionUpdate | null> {
  const [result] = await db
    .select()
    .from(versionUpdate)
    .where(eq(versionUpdate.isLatest, "true"))
    .limit(1);

  return result || null;
}

/**
 * Get all published versions
 */
export async function getPublishedVersions(limit = 50): Promise<VersionUpdate[]> {
  return db
    .select()
    .from(versionUpdate)
    .where(eq(versionUpdate.status, "published"))
    .orderBy(desc(versionUpdate.publishedAt))
    .limit(limit);
}

/**
 * Get all versions (admin)
 */
export async function getAllVersions(): Promise<VersionUpdate[]> {
  return db
    .select()
    .from(versionUpdate)
    .orderBy(desc(versionUpdate.createdAt));
}

/**
 * Publish version
 */
export async function publishVersion(versionId: string, publishedBy: string): Promise<VersionUpdate | null> {
  const now = new Date();

  // First, set all versions to not latest
  await db
    .update(versionUpdate)
    .set({ isLatest: "false" });

  // Then publish this version and set as latest
  const [updated] = await db
    .update(versionUpdate)
    .set({
      status: "published",
      isLatest: "true",
      publishedBy,
      publishedAt: now,
      updatedAt: now,
    })
    .where(eq(versionUpdate.id, versionId))
    .returning();

  return updated || null;
}

/**
 * Update version content
 */
export async function updateVersionContent(
  versionId: string,
  data: {
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
): Promise<VersionUpdate | null> {
  const [updated] = await db
    .update(versionUpdate)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(versionUpdate.id, versionId))
    .returning();

  return updated || null;
}

/**
 * Archive version
 */
export async function archiveVersion(versionId: string): Promise<VersionUpdate | null> {
  const [updated] = await db
    .update(versionUpdate)
    .set({
      status: "archived",
      isLatest: "false",
      updatedAt: new Date(),
    })
    .where(eq(versionUpdate.id, versionId))
    .returning();

  return updated || null;
}

/**
 * Delete version
 */
export async function deleteVersion(versionId: string): Promise<boolean> {
  await db
    .delete(versionUpdate)
    .where(eq(versionUpdate.id, versionId));

  return true;
}
