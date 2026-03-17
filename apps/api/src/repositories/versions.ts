import { desc, eq } from "drizzle-orm";
import {
  type VersionRecord,
  type VersionsRepository,
  versionUpdate,
} from "@z0/backend";
import { db } from "./shared";

export class DrizzleVersionsRepository implements VersionsRepository {
  create(input: {
    publishedBy: string;
    version: string;
    title: string;
    description?: string;
    type: "major" | "minor" | "patch";
    features?: { title: string; description?: string }[];
    improvements?: { title: string; description?: string }[];
    bugFixes?: { title: string; description?: string }[];
    breaking?: { title: string; description?: string }[];
    highlights?: string[];
    migration?: string;
    downloadUrl?: string;
    docsUrl?: string;
  }) {
    const now = new Date();
    return db
      .insert(versionUpdate)
      .values({
        version: input.version,
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        features: input.features ?? [],
        improvements: input.improvements ?? [],
        bugFixes: input.bugFixes ?? [],
        breaking: input.breaking ?? [],
        highlights: input.highlights ?? [],
        migration: input.migration ?? null,
        status: "draft",
        isLatest: false,
        publishedBy: input.publishedBy,
        downloadUrl: input.downloadUrl ?? null,
        docsUrl: input.docsUrl ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .then((rows) => rows[0] as VersionRecord);
  }

  findById(versionId: string) {
    return db
      .select()
      .from(versionUpdate)
      .where(eq(versionUpdate.id, versionId))
      .limit(1)
      .then((rows) => (rows[0] as VersionRecord | undefined) ?? null);
  }

  findByVersion(version: string) {
    return db
      .select()
      .from(versionUpdate)
      .where(eq(versionUpdate.version, version))
      .limit(1)
      .then((rows) => (rows[0] as VersionRecord | undefined) ?? null);
  }

  findLatest() {
    return db
      .select()
      .from(versionUpdate)
      .where(eq(versionUpdate.isLatest, true))
      .limit(1)
      .then((rows) => (rows[0] as VersionRecord | undefined) ?? null);
  }

  listPublished(limit: number) {
    return db
      .select()
      .from(versionUpdate)
      .where(eq(versionUpdate.status, "published"))
      .orderBy(desc(versionUpdate.publishedAt))
      .limit(limit) as Promise<VersionRecord[]>;
  }

  listAll() {
    return db
      .select()
      .from(versionUpdate)
      .orderBy(desc(versionUpdate.createdAt)) as Promise<VersionRecord[]>;
  }

  async publish(versionId: string, actorUserId: string) {
    const now = new Date();
    await db.update(versionUpdate).set({ isLatest: false });
    const rows = await db
      .update(versionUpdate)
      .set({
        status: "published",
        isLatest: true,
        publishedBy: actorUserId,
        publishedAt: now,
        updatedAt: now,
      })
      .where(eq(versionUpdate.id, versionId))
      .returning();
    return (rows[0] as VersionRecord | undefined) ?? null;
  }

  update(
    versionId: string,
    input: Partial<
      Omit<VersionRecord, "id" | "createdAt" | "updatedAt" | "publishedAt">
    >,
  ) {
    return db
      .update(versionUpdate)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(versionUpdate.id, versionId))
      .returning()
      .then((rows) => (rows[0] as VersionRecord | undefined) ?? null);
  }

  archive(versionId: string) {
    return db
      .update(versionUpdate)
      .set({ status: "archived", isLatest: false, updatedAt: new Date() })
      .where(eq(versionUpdate.id, versionId))
      .returning()
      .then((rows) => (rows[0] as VersionRecord | undefined) ?? null);
  }

  async delete(versionId: string) {
    await db.delete(versionUpdate).where(eq(versionUpdate.id, versionId));
    return true;
  }
}
