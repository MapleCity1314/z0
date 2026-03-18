"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { getActionErrorMessage } from "@/lib/auth-errors";
import {
  addFeedbackResponse,
  archiveVersion,
  createVersion,
  deleteVersion,
  publishVersion,
  updateFeedbackStatus,
} from "@/lib/admin/client";
import type {
  CreateAdminVersionInput,
  FeedbackStatus,
} from "@/lib/admin/contracts";

type AdminActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

function toAdminActionError(error: unknown, fallback: string): AdminActionResult {
  return {
    success: false,
    message: getActionErrorMessage(error, fallback),
  };
}

// Feedback Actions
export async function updateFeedbackStatusAction(
  feedbackId: string,
  status: FeedbackStatus,
): Promise<AdminActionResult> {
  try {
    await updateFeedbackStatus(feedbackId, status);
    revalidatePath(`/admin/feedback/${feedbackId}`);
    revalidatePath("/admin/feedback");
    return { success: true, message: "Feedback status updated." };
  } catch (error) {
    return toAdminActionError(error, "Failed to update feedback status.");
  }
}

export async function addFeedbackResponseAction(
  feedbackId: string,
  response: string,
): Promise<AdminActionResult> {
  try {
    await addFeedbackResponse(feedbackId, response);
    revalidatePath(`/admin/feedback/${feedbackId}`);
    revalidatePath("/admin/feedback");
    return { success: true, message: "Feedback response added." };
  } catch (error) {
    return toAdminActionError(error, "Failed to add a feedback response.");
  }
}

// Version Actions
export async function createVersionAction(data: CreateAdminVersionInput) {
  try {
    await createVersion(data);
    revalidatePath("/admin/versions");
    redirect("/admin/versions");
  } catch (error) {
    unstable_rethrow(error);
    return toAdminActionError(error, "Failed to create version.");
  }
}

export async function publishVersionAction(
  versionId: string,
): Promise<AdminActionResult> {
  try {
    await publishVersion(versionId);
    revalidatePath(`/admin/versions/${versionId}`);
    revalidatePath("/admin/versions");
    return { success: true, message: "Version published." };
  } catch (error) {
    unstable_rethrow(error);
    return toAdminActionError(error, "Failed to publish version.");
  }
}

export async function archiveVersionAction(
  versionId: string,
): Promise<AdminActionResult> {
  try {
    await archiveVersion(versionId);
    revalidatePath(`/admin/versions/${versionId}`);
    revalidatePath("/admin/versions");
    return { success: true, message: "Version archived." };
  } catch (error) {
    unstable_rethrow(error);
    return toAdminActionError(error, "Failed to archive version.");
  }
}

export async function deleteVersionAction(versionId: string) {
  try {
    await deleteVersion(versionId);
    revalidatePath("/admin/versions");
    redirect("/admin/versions");
  } catch (error) {
    unstable_rethrow(error);
    return toAdminActionError(error, "Failed to delete version.");
  }
}
