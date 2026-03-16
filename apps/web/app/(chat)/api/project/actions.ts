"use server";

import { db } from "@/lib/db";
import { project, type Project } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import { eq, desc, and } from "drizzle-orm";

type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

export async function createProject(formData: FormData): Promise<ActionResult<Project>> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, message: "User not authenticated" };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;

    if (!name || !type) {
      return { success: false, message: "Name and type are required" };
    }

    const [newProject] = await db
      .insert(project)
      .values({
        userId: user.id,
        name,
        description: description || null,
        type,
        status: "draft",
        visibility: "private",
        files: {},
        tags: [],
        likes: 0,
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      success: true,
      message: "Project created successfully",
      data: newProject,
    };
  } catch (error) {
    console.error("Create project error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

export async function getProjectsByUserId(): Promise<ActionResult<Project[]>> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, message: "User not authenticated", data: [] };
    }

    const projects = await db
      .select()
      .from(project)
      .where(eq(project.userId, user.id))
      .orderBy(desc(project.updatedAt));

    return {
      success: true,
      message: "Projects retrieved successfully",
      data: projects,
    };
  } catch (error) {
    console.error("Get projects error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to get projects",
      data: [],
    };
  }
}

export async function getProjectById(id: string): Promise<ActionResult<Project>> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, message: "User not authenticated" };
    }

    const [projectData] = await db
      .select()
      .from(project)
      .where(and(eq(project.id, id), eq(project.userId, user.id)))
      .limit(1);

    if (!projectData) {
      return { success: false, message: "Project not found" };
    }

    return {
      success: true,
      message: "Project retrieved successfully",
      data: projectData,
    };
  } catch (error) {
    console.error("Get project error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to get project",
    };
  }
}

export async function updateProject(
  id: string,
  formData: FormData
): Promise<ActionResult<Project>> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, message: "User not authenticated" };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;

    const [updatedProject] = await db
      .update(project)
      .set({
        name,
        description: description || null,
        type,
        updatedAt: new Date(),
      })
      .where(and(eq(project.id, id), eq(project.userId, user.id)))
      .returning();

    if (!updatedProject) {
      return { success: false, message: "Project not found or access denied" };
    }

    return {
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    };
  } catch (error) {
    console.error("Update project error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update project",
    };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, message: "User not authenticated" };
    }

    const result = await db
      .delete(project)
      .where(and(eq(project.id, id), eq(project.userId, user.id)))
      .returning();

    if (result.length === 0) {
      return { success: false, message: "Project not found or access denied" };
    }

    return {
      success: true,
      message: "Project deleted successfully",
    };
  } catch (error) {
    console.error("Delete project error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete project",
    };
  }
}
