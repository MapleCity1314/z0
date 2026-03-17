"use server";

import { apiFetch } from "@/lib/api";
import type { VersionUpdate } from "@/lib/schema";

type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

interface ChangelogItem {
  title: string;
  description?: string;
}

export async function createVersionAction(data: {
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
  downloadUrl?: string;
  docsUrl?: string;
}): Promise<ActionResult<VersionUpdate>> {
  try {
    const version = await apiFetch<VersionUpdate>("/v1/admin/versions", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { success: true, message: "Version created successfully", data: version };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to create version" };
  }
}

export async function getLatestVersionAction(): Promise<ActionResult<VersionUpdate>> {
  try {
    const version = await apiFetch<VersionUpdate>("/v1/versions/latest");
    return { success: true, message: "Latest version retrieved successfully", data: version };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to retrieve latest version" };
  }
}

export async function getVersionByNumberAction(version: string): Promise<ActionResult<VersionUpdate>> {
  try {
    const data = await apiFetch<VersionUpdate>(`/v1/versions/${version}`);
    return { success: true, message: "Version retrieved successfully", data };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to retrieve version" };
  }
}

export async function getPublishedVersionsAction(limit = 50): Promise<ActionResult<VersionUpdate[]>> {
  try {
    const versions = await apiFetch<VersionUpdate[]>(`/v1/versions/published?limit=${limit}`);
    return { success: true, message: "Versions retrieved successfully", data: versions };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to retrieve versions" };
  }
}

export async function getAllVersionsAction(): Promise<ActionResult<VersionUpdate[]>> {
  try {
    const versions = await apiFetch<VersionUpdate[]>("/v1/admin/versions");
    return { success: true, message: "Versions retrieved successfully", data: versions };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to retrieve versions" };
  }
}

export async function publishVersionAction(versionId: string): Promise<ActionResult<VersionUpdate>> {
  try {
    const version = await apiFetch<VersionUpdate>(`/v1/admin/versions/${versionId}/publish`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    return { success: true, message: "Version published successfully", data: version };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to publish version" };
  }
}

export async function updateVersionAction(versionId: string, data: {
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
}): Promise<ActionResult<VersionUpdate>> {
  try {
    const version = await apiFetch<VersionUpdate>(`/v1/admin/versions/${versionId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return { success: true, message: "Version updated successfully", data: version };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to update version" };
  }
}

export async function archiveVersionAction(versionId: string): Promise<ActionResult<VersionUpdate>> {
  try {
    const version = await apiFetch<VersionUpdate>(`/v1/admin/versions/${versionId}/archive`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    return { success: true, message: "Version archived successfully", data: version };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to archive version" };
  }
}

export async function deleteVersionAction(versionId: string): Promise<ActionResult> {
  try {
    await apiFetch<{ deleted: true }>(`/v1/admin/versions/${versionId}`, { method: "DELETE" });
    return { success: true, message: "Version deleted successfully" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to delete version" };
  }
}
