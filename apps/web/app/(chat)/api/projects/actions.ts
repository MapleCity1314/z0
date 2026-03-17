"use server";

import type { Project } from "@/lib/schema";
import { apiFetch } from "@/lib/api";

type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

export async function createProjectAction(data: {
  name: string;
  description?: string;
  type: "vue" | "react" | "nextjs";
  visibility?: "private" | "public";
}): Promise<ActionResult<Project>> {
  try {
    const project = await apiFetch<Project>("/v1/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { success: true, message: "Project created successfully", data: project };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to create project" };
  }
}

export async function getUserProjectsAction(): Promise<ActionResult<Project[]>> {
  try {
    const projects = await apiFetch<Project[]>("/v1/projects");
    return { success: true, message: "Projects retrieved successfully", data: projects };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to retrieve projects" };
  }
}

export async function getProjectAction(projectId: string): Promise<ActionResult<Project>> {
  try {
    const project = await apiFetch<Project>(`/v1/projects/${projectId}`);
    return { success: true, message: "Project retrieved successfully", data: project };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to retrieve project" };
  }
}

export async function updateProjectFilesAction(projectId: string, files: Record<string, string>): Promise<ActionResult<Project>> {
  try {
    const project = await apiFetch<Project>(`/v1/projects/${projectId}/files`, {
      method: "PATCH",
      body: JSON.stringify({ files }),
    });
    return { success: true, message: "Files updated successfully", data: project };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to update files" };
  }
}

export async function deployProjectAction(projectId: string, deploymentUrl: string, provider: string): Promise<ActionResult<Project>> {
  try {
    const project = await apiFetch<Project>(`/v1/projects/${projectId}/deploy`, {
      method: "POST",
      body: JSON.stringify({ deploymentUrl, provider }),
    });
    return { success: true, message: "Project deployed successfully", data: project };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to deploy project" };
  }
}

export async function publishProjectAction(projectId: string): Promise<ActionResult<Project>> {
  try {
    const project = await apiFetch<Project>(`/v1/projects/${projectId}/publish`, { method: "POST", body: JSON.stringify({}) });
    return { success: true, message: "Project published to community", data: project };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to publish project" };
  }
}

export async function unpublishProjectAction(projectId: string): Promise<ActionResult<Project>> {
  try {
    const project = await apiFetch<Project>(`/v1/projects/${projectId}/unpublish`, { method: "POST", body: JSON.stringify({}) });
    return { success: true, message: "Project unpublished from community", data: project };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to unpublish project" };
  }
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  try {
    await apiFetch<{ deleted: true }>(`/v1/projects/${projectId}`, { method: "DELETE" });
    return { success: true, message: "Project deleted successfully" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to delete project" };
  }
}

export async function updateProjectMetadataAction(projectId: string, data: { name?: string; description?: string; tags?: string[]; }): Promise<ActionResult<Project>> {
  try {
    const project = await apiFetch<Project>(`/v1/projects/${projectId}/metadata`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return { success: true, message: "Project updated successfully", data: project };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to update project" };
  }
}

export async function getPublicProjectsAction(limit = 50): Promise<ActionResult<Project[]>> {
  try {
    const projects = await apiFetch<Project[]>(`/v1/projects/public?limit=${limit}`);
    return { success: true, message: "Public projects retrieved successfully", data: projects };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to retrieve public projects" };
  }
}
