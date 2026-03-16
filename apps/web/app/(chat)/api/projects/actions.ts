"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createProject,
  getProjectById,
  getProjectsByUserId,
  getPublicProjects,
  updateProjectFiles,
  updateProjectStatus,
  updateProjectDeployment,
  publishProject,
  unpublishProject,
  deleteProject,
  updateProjectMetadata,
} from "@/lib/project/db/project-queries";
import type { Project } from "@/lib/schema";

type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

/**
 * Create a new project
 */
export async function createProjectAction(data: {
  name: string;
  description?: string;
  type: "vue" | "react" | "nextjs";
  visibility?: "private" | "public";
}): Promise<ActionResult<Project>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const project = await createProject({
      userId: session.user.id,
      name: data.name,
      description: data.description,
      type: data.type,
      visibility: data.visibility,
    });

    return {
      success: true,
      message: "Project created successfully",
      data: project,
    };
  } catch (error) {
    console.error("Create project error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

/**
 * Get user's projects
 */
export async function getUserProjectsAction(): Promise<ActionResult<Project[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const projects = await getProjectsByUserId(session.user.id);

    return {
      success: true,
      message: "Projects retrieved successfully",
      data: projects,
    };
  } catch (error) {
    console.error("Get projects error:", error);
    return {
      success: false,
      message: "Failed to retrieve projects",
    };
  }
}

/**
 * Get project by ID
 */
export async function getProjectAction(projectId: string): Promise<ActionResult<Project>> {
  try {
    const session = await getServerSession(authOptions);
    const project = await getProjectById(projectId);

    if (!project) {
      return { success: false, message: "Project not found" };
    }

    // Check permissions: owner or public project
    if (project.visibility === "private" && project.userId !== session?.user?.id) {
      return { success: false, message: "Access denied" };
    }

    return {
      success: true,
      message: "Project retrieved successfully",
      data: project,
    };
  } catch (error) {
    console.error("Get project error:", error);
    return {
      success: false,
      message: "Failed to retrieve project",
    };
  }
}

/**
 * Update project files
 */
export async function updateProjectFilesAction(
  projectId: string,
  files: Record<string, string>
): Promise<ActionResult<Project>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const project = await getProjectById(projectId);
    if (!project || project.userId !== session.user.id) {
      return { success: false, message: "Access denied" };
    }

    const updated = await updateProjectFiles(projectId, files);
    if (!updated) {
      return { success: false, message: "Failed to update files" };
    }

    return {
      success: true,
      message: "Files updated successfully",
      data: updated,
    };
  } catch (error) {
    console.error("Update files error:", error);
    return {
      success: false,
      message: "Failed to update files",
    };
  }
}

/**
 * Deploy project
 */
export async function deployProjectAction(
  projectId: string,
  deploymentUrl: string,
  provider: string
): Promise<ActionResult<Project>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const project = await getProjectById(projectId);
    if (!project || project.userId !== session.user.id) {
      return { success: false, message: "Access denied" };
    }

    const updated = await updateProjectDeployment(projectId, deploymentUrl, provider);
    if (!updated) {
      return { success: false, message: "Failed to update deployment" };
    }

    return {
      success: true,
      message: "Project deployed successfully",
      data: updated,
    };
  } catch (error) {
    console.error("Deploy project error:", error);
    return {
      success: false,
      message: "Failed to deploy project",
    };
  }
}

/**
 * Publish project to community
 */
export async function publishProjectAction(projectId: string): Promise<ActionResult<Project>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const project = await getProjectById(projectId);
    if (!project || project.userId !== session.user.id) {
      return { success: false, message: "Access denied" };
    }

    const updated = await publishProject(projectId);
    if (!updated) {
      return { success: false, message: "Failed to publish project" };
    }

    return {
      success: true,
      message: "Project published to community",
      data: updated,
    };
  } catch (error) {
    console.error("Publish project error:", error);
    return {
      success: false,
      message: "Failed to publish project",
    };
  }
}

/**
 * Unpublish project from community
 */
export async function unpublishProjectAction(projectId: string): Promise<ActionResult<Project>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const project = await getProjectById(projectId);
    if (!project || project.userId !== session.user.id) {
      return { success: false, message: "Access denied" };
    }

    const updated = await unpublishProject(projectId);
    if (!updated) {
      return { success: false, message: "Failed to unpublish project" };
    }

    return {
      success: true,
      message: "Project unpublished from community",
      data: updated,
    };
  } catch (error) {
    console.error("Unpublish project error:", error);
    return {
      success: false,
      message: "Failed to unpublish project",
    };
  }
}

/**
 * Delete project
 */
export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const deleted = await deleteProject(projectId, session.user.id);
    if (!deleted) {
      return { success: false, message: "Failed to delete project" };
    }

    return {
      success: true,
      message: "Project deleted successfully",
    };
  } catch (error) {
    console.error("Delete project error:", error);
    return {
      success: false,
      message: "Failed to delete project",
    };
  }
}

/**
 * Update project metadata
 */
export async function updateProjectMetadataAction(
  projectId: string,
  data: {
    name?: string;
    description?: string;
    tags?: string[];
  }
): Promise<ActionResult<Project>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const project = await getProjectById(projectId);
    if (!project || project.userId !== session.user.id) {
      return { success: false, message: "Access denied" };
    }

    const updated = await updateProjectMetadata(projectId, data);
    if (!updated) {
      return { success: false, message: "Failed to update project" };
    }

    return {
      success: true,
      message: "Project updated successfully",
      data: updated,
    };
  } catch (error) {
    console.error("Update project error:", error);
    return {
      success: false,
      message: "Failed to update project",
    };
  }
}

/**
 * Get public projects (community)
 */
export async function getPublicProjectsAction(limit = 50): Promise<ActionResult<Project[]>> {
  try {
    const projects = await getPublicProjects(limit);

    return {
      success: true,
      message: "Public projects retrieved successfully",
      data: projects,
    };
  } catch (error) {
    console.error("Get public projects error:", error);
    return {
      success: false,
      message: "Failed to retrieve public projects",
    };
  }
}
