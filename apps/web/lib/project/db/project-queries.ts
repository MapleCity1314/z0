import { db } from "@/lib/db";
import { project, type Project } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Create a new project
 */
export async function createProject(data: {
  userId: string;
  name: string;
  description?: string;
  type: "vue" | "react" | "nextjs" | "vanilla";
  visibility?: "private" | "public";
  files?: Record<string, string>;
  buildConfig?: Record<string, unknown>;
  tags?: string[];
}) {
  const now = new Date();
  
  const [newProject] = await db
    .insert(project)
    .values({
      userId: data.userId,
      name: data.name,
      description: data.description,
      type: data.type,
      status: "draft",
      visibility: data.visibility || "private",
      files: data.files || {},
      buildConfig: data.buildConfig || null,
      tags: data.tags || [],
      likes: 0,
      views: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return newProject;
}

/**
 * Get project by ID
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  const [result] = await db
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);

  return result || null;
}

/**
 * Get all projects by user ID
 */
export async function getProjectsByUserId(userId: string): Promise<Project[]> {
  return db
    .select()
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.updatedAt));
}

/**
 * Get public projects (for community)
 */
export async function getPublicProjects(limit = 50): Promise<Project[]> {
  return db
    .select()
    .from(project)
    .where(eq(project.visibility, "public"))
    .orderBy(desc(project.publishedAt))
    .limit(limit);
}

/**
 * Update project files
 */
export async function updateProjectFiles(
  projectId: string,
  files: Record<string, string>
): Promise<Project | null> {
  const [updated] = await db
    .update(project)
    .set({
      files,
      updatedAt: new Date(),
    })
    .where(eq(project.id, projectId))
    .returning();

  return updated || null;
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  projectId: string,
  status: "draft" | "building" | "deployed" | "failed"
): Promise<Project | null> {
  const [updated] = await db
    .update(project)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(project.id, projectId))
    .returning();

  return updated || null;
}

/**
 * Update project deployment info
 */
export async function updateProjectDeployment(
  projectId: string,
  deploymentUrl: string,
  deploymentProvider: string
): Promise<Project | null> {
  const now = new Date();
  
  const [updated] = await db
    .update(project)
    .set({
      deploymentUrl,
      deploymentProvider,
      status: "deployed",
      lastDeployedAt: now,
      updatedAt: now,
    })
    .where(eq(project.id, projectId))
    .returning();

  return updated || null;
}

/**
 * Publish project to community
 */
export async function publishProject(projectId: string): Promise<Project | null> {
  const now = new Date();
  
  const [updated] = await db
    .update(project)
    .set({
      visibility: "public",
      publishedAt: now,
      updatedAt: now,
    })
    .where(eq(project.id, projectId))
    .returning();

  return updated || null;
}

/**
 * Unpublish project from community
 */
export async function unpublishProject(projectId: string): Promise<Project | null> {
  const [updated] = await db
    .update(project)
    .set({
      visibility: "private",
      updatedAt: new Date(),
    })
    .where(eq(project.id, projectId))
    .returning();

  return updated || null;
}

/**
 * Delete project
 */
export async function deleteProject(projectId: string, userId: string): Promise<boolean> {
  await db
    .delete(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)));

  return true;
}

/**
 * Increment project views
 */
export async function incrementProjectViews(projectId: string): Promise<void> {
  await db.execute(`
    UPDATE "Project" 
    SET views = COALESCE(views::int, 0) + 1 
    WHERE id = '${projectId}'
  `);
}

/**
 * Update project metadata
 */
export async function updateProjectMetadata(
  projectId: string,
  data: {
    name?: string;
    description?: string;
    tags?: string[];
  }
): Promise<Project | null> {
  const [updated] = await db
    .update(project)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(project.id, projectId))
    .returning();

  return updated || null;
}
