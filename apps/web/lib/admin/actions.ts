"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  updateFeedbackStatus as dbUpdateFeedbackStatus,
  addFeedbackResponse as dbAddFeedbackResponse,
} from "@/lib/db/feedback-queries";
import {
  createVersionUpdate as dbCreateVersionUpdate,
  publishVersion as dbPublishVersion,
  archiveVersion as dbArchiveVersion,
  deleteVersion as dbDeleteVersion,
} from "@/lib/db/version-queries";

// Feedback Actions
export async function updateFeedbackStatusAction(
  feedbackId: string,
  status: "pending" | "reviewing" | "planned" | "completed" | "rejected"
) {
  await dbUpdateFeedbackStatus(feedbackId, status);
  revalidatePath(`/admin/feedback/${feedbackId}`);
  revalidatePath("/admin/feedback");
}

export async function addFeedbackResponseAction(
  feedbackId: string,
  response: string
) {
  // TODO: 获取当前管理员ID
  const adminId = "";
  await dbAddFeedbackResponse(feedbackId, adminId, response);
  revalidatePath(`/admin/feedback/${feedbackId}`);
}

// Version Actions
export async function createVersionAction(data: {
  version: string;
  title: string;
  description?: string;
  type: "major" | "minor" | "patch";
}) {
  await dbCreateVersionUpdate(data);
  revalidatePath("/admin/versions");
  redirect("/admin/versions");
}

export async function publishVersionAction(versionId: string) {
  // TODO: 获取当前管理员ID
  const adminId = "";
  await dbPublishVersion(versionId, adminId);
  revalidatePath(`/admin/versions/${versionId}`);
  revalidatePath("/admin/versions");
}

export async function archiveVersionAction(versionId: string) {
  await dbArchiveVersion(versionId);
  revalidatePath(`/admin/versions/${versionId}`);
  revalidatePath("/admin/versions");
}

export async function deleteVersionAction(versionId: string) {
  await dbDeleteVersion(versionId);
  revalidatePath("/admin/versions");
  redirect("/admin/versions");
}
