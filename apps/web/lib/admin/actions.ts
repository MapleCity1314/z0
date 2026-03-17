"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

// Feedback Actions
export async function updateFeedbackStatusAction(
  feedbackId: string,
  status: FeedbackStatus,
) {
  await updateFeedbackStatus(feedbackId, status);
  revalidatePath(`/admin/feedback/${feedbackId}`);
  revalidatePath("/admin/feedback");
}

export async function addFeedbackResponseAction(
  feedbackId: string,
  response: string,
) {
  await addFeedbackResponse(feedbackId, response);
  revalidatePath(`/admin/feedback/${feedbackId}`);
  revalidatePath("/admin/feedback");
}

// Version Actions
export async function createVersionAction(data: CreateAdminVersionInput) {
  await createVersion(data);
  revalidatePath("/admin/versions");
  redirect("/admin/versions");
}

export async function publishVersionAction(versionId: string) {
  await publishVersion(versionId);
  revalidatePath(`/admin/versions/${versionId}`);
  revalidatePath("/admin/versions");
}

export async function archiveVersionAction(versionId: string) {
  await archiveVersion(versionId);
  revalidatePath(`/admin/versions/${versionId}`);
  revalidatePath("/admin/versions");
}

export async function deleteVersionAction(versionId: string) {
  await deleteVersion(versionId);
  revalidatePath("/admin/versions");
  redirect("/admin/versions");
}
