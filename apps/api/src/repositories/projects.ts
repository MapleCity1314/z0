import { desc, eq } from "drizzle-orm";
import {
  project,
  type ProjectRecord,
  type ProjectsRepository,
} from "@z0/backend";
import { db } from "./shared";

export class DrizzleProjectsRepository implements ProjectsRepository {
  create(input: {
    userId: string;
    name: string;
    description?: string;
    type: "vue" | "react" | "nextjs" | "vanilla";
    visibility?: "private" | "public";
  }) {
    const now = new Date();
    return db
      .insert(project)
      .values({
        userId: input.userId,
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        status: "draft",
        visibility: input.visibility ?? "private",
        files: {},
        tags: [],
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .then((rows) => rows[0] as ProjectRecord);
  }

  findById(projectId: string) {
    return db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)
      .then((rows) => (rows[0] as ProjectRecord | undefined) ?? null);
  }

  listByUserId(userId: string) {
    return db
      .select()
      .from(project)
      .where(eq(project.userId, userId))
      .orderBy(desc(project.updatedAt)) as Promise<ProjectRecord[]>;
  }

  listPublic(limit: number) {
    return db
      .select()
      .from(project)
      .where(eq(project.visibility, "public"))
      .orderBy(desc(project.publishedAt))
      .limit(limit) as Promise<ProjectRecord[]>;
  }

  updateFiles(projectId: string, files: Record<string, string>) {
    return db
      .update(project)
      .set({ files, updatedAt: new Date() })
      .where(eq(project.id, projectId))
      .returning()
      .then((rows) => (rows[0] as ProjectRecord | undefined) ?? null);
  }

  updateMetadata(
    projectId: string,
    updates: { name?: string; description?: string | null; tags?: string[] },
  ) {
    return db
      .update(project)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(project.id, projectId))
      .returning()
      .then((rows) => (rows[0] as ProjectRecord | undefined) ?? null);
  }

  markDeployed(
    projectId: string,
    deployment: { deploymentUrl: string; provider: string; deployedAt: Date },
  ) {
    return db
      .update(project)
      .set({
        deploymentUrl: deployment.deploymentUrl,
        deploymentProvider: deployment.provider,
        status: "deployed",
        lastDeployedAt: deployment.deployedAt,
        updatedAt: deployment.deployedAt,
      })
      .where(eq(project.id, projectId))
      .returning()
      .then((rows) => (rows[0] as ProjectRecord | undefined) ?? null);
  }

  setVisibility(
    projectId: string,
    visibility: "private" | "public",
    publishedAt?: Date | null,
  ) {
    return db
      .update(project)
      .set({
        visibility,
        publishedAt: publishedAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(project.id, projectId))
      .returning()
      .then((rows) => (rows[0] as ProjectRecord | undefined) ?? null);
  }

  async delete(projectId: string) {
    await db.delete(project).where(eq(project.id, projectId));
    return true;
  }
}
