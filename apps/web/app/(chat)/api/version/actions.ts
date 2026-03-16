"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createVersionUpdate,
  getVersionById,
  getVersionByNumber,
  getLatestVersion,
  getPublishedVersions,
  getAllVersions,
  publishVersion,
  updateVersionContent,
  archiveVersion,
  deleteVersion,
} from "@/lib/db/version-queries";
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

/**
 * Create version update (admin only)
 */
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // TODO: Add admin role check

    const version = await createVersionUpdate({
      ...data,
      publishedBy: session.user.id,
    });

    return {
      success: true,
      message: "Version created successfully",
      data: version,
    };
  } catch (error) {
    console.error("Create version error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create version",
    };
  }
}

/**
 * Get latest version (public)
 */
export async function getLatestVersionAction(): Promise<ActionResult<VersionUpdate>> {
  try {
    const version = await getLatestVersion();

    if (!version) {
      return { success: false, message: "No version found" };
    }

    return {
      success: true,
      message: "Latest version retrieved successfully",
      data: version,
    };
  } catch (error) {
    console.error("Get latest version error:", error);
    return {
      success: false,
      message: "Failed to retrieve latest version",
    };
  }
}

/**
 * Get version by number (public)
 */
export async function getVersionByNumberAction(version: string): Promise<ActionResult<VersionUpdate>> {
  try {
    const versionData = await getVersionByNumber(version);

    if (!versionData) {
      return { success: false, message: "Version not found" };
    }

    return {
      success: true,
      message: "Version retrieved successfully",
      data: versionData,
    };
  } catch (error) {
    console.error("Get version error:", error);
    return {
      success: false,
      message: "Failed to retrieve version",
    };
  }
}

/**
 * Get all published versions (public)
 */
export async function getPublishedVersionsAction(limit = 50): Promise<ActionResult<VersionUpdate[]>> {
  try {
    const versions = await getPublishedVersions(limit);

    return {
      success: true,
      message: "Versions retrieved successfully",
      data: versions,
    };
  } catch (error) {
    console.error("Get published versions error:", error);
    return {
      success: false,
      message: "Failed to retrieve versions",
    };
  }
}

/**
 * Get all versions (admin only)
 */
export async function getAllVersionsAction(): Promise<ActionResult<VersionUpdate[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // TODO: Add admin role check

    const versions = await getAllVersions();

    return {
      success: true,
      message: "Versions retrieved successfully",
      data: versions,
    };
  } catch (error) {
    console.error("Get all versions error:", error);
    return {
      success: false,
      message: "Failed to retrieve versions",
    };
  }
}

/**
 * Publish version (admin only)
 */
export async function publishVersionAction(versionId: string): Promise<ActionResult<VersionUpdate>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // TODO: Add admin role check

    const published = await publishVersion(versionId, session.user.id);

    if (!published) {
      return { success: false, message: "Failed to publish version" };
    }

    return {
      success: true,
      message: "Version published successfully",
      data: published,
    };
  } catch (error) {
    console.error("Publish version error:", error);
    return {
      success: false,
      message: "Failed to publish version",
    };
  }
}

/**
 * Update version content (admin only)
 */
export async function updateVersionAction(
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
): Promise<ActionResult<VersionUpdate>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // TODO: Add admin role check

    const updated = await updateVersionContent(versionId, data);

    if (!updated) {
      return { success: false, message: "Failed to update version" };
    }

    return {
      success: true,
      message: "Version updated successfully",
      data: updated,
    };
  } catch (error) {
    console.error("Update version error:", error);
    return {
      success: false,
      message: "Failed to update version",
    };
  }
}

/**
 * Archive version (admin only)
 */
export async function archiveVersionAction(versionId: string): Promise<ActionResult<VersionUpdate>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // TODO: Add admin role check

    const archived = await archiveVersion(versionId);

    if (!archived) {
      return { success: false, message: "Failed to archive version" };
    }

    return {
      success: true,
      message: "Version archived successfully",
      data: archived,
    };
  } catch (error) {
    console.error("Archive version error:", error);
    return {
      success: false,
      message: "Failed to archive version",
    };
  }
}

/**
 * Delete version (admin only)
 */
export async function deleteVersionAction(versionId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // TODO: Add admin role check

    const deleted = await deleteVersion(versionId);

    if (!deleted) {
      return { success: false, message: "Failed to delete version" };
    }

    return {
      success: true,
      message: "Version deleted successfully",
    };
  } catch (error) {
    console.error("Delete version error:", error);
    return {
      success: false,
      message: "Failed to delete version",
    };
  }
}
