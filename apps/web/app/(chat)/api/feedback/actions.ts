"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api";
import { getActionErrorMessage } from "@/lib/auth-errors";
import { getCurrentUser } from "@/lib/session";
import type { Feedback } from "@/lib/schema";

type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

export async function submitFeedbackAction(data: {
  type: "bug" | "feature" | "improvement" | "other";
  category?: string;
  title: string;
  content: string;
  priority?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
  attachments?: string[];
}): Promise<ActionResult<Feedback>> {
  try {
    const feedback = await apiFetch<Feedback>("/v1/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const user = await getCurrentUser();
    revalidateTag("user-feedback", "max");
    if (user?.id) {
      revalidateTag(`user-feedback-${user.id}`, "max");
    }
    return { success: true, message: "Feedback submitted successfully", data: feedback };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to submit feedback"),
    };
  }
}

export async function getUserFeedbackAction(): Promise<ActionResult<Feedback[]>> {
  try {
    const feedback = await apiFetch<Feedback[]>("/v1/feedback");
    return { success: true, message: "Feedback retrieved successfully", data: feedback };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to retrieve feedback"),
    };
  }
}

export async function getFeedbackAction(feedbackId: string): Promise<ActionResult<Feedback>> {
  try {
    const feedback = await apiFetch<Feedback>(`/v1/feedback/${feedbackId}`);
    return { success: true, message: "Feedback retrieved successfully", data: feedback };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to retrieve feedback"),
    };
  }
}

export async function getAllFeedbackAction(filters?: { type?: string; status?: string; priority?: string; }): Promise<ActionResult<Feedback[]>> {
  try {
    const params = new URLSearchParams();
    if (filters?.type) params.set("type", filters.type);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.priority) params.set("priority", filters.priority);
    const suffix = params.size ? `?${params.toString()}` : "";
    const feedback = await apiFetch<Feedback[]>(`/v1/admin/feedback${suffix}`);
    return { success: true, message: "Feedback retrieved successfully", data: feedback };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to retrieve feedback"),
    };
  }
}

export async function updateFeedbackStatusAction(feedbackId: string, status: "pending" | "reviewing" | "planned" | "completed" | "rejected"): Promise<ActionResult<Feedback>> {
  try {
    const feedback = await apiFetch<Feedback>(`/v1/admin/feedback/${feedbackId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return { success: true, message: "Feedback status updated successfully", data: feedback };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to update feedback status"),
    };
  }
}

export async function addFeedbackResponseAction(feedbackId: string, response: string): Promise<ActionResult<Feedback>> {
  try {
    const feedback = await apiFetch<Feedback>(`/v1/admin/feedback/${feedbackId}/respond`, {
      method: "POST",
      body: JSON.stringify({ response }),
    });
    return { success: true, message: "Response added successfully", data: feedback };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to add response"),
    };
  }
}

export async function deleteFeedbackAction(feedbackId: string): Promise<ActionResult> {
  try {
    await apiFetch<{ deleted: true }>(`/v1/feedback/${feedbackId}`, { method: "DELETE" });
    return { success: true, message: "Feedback deleted successfully" };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to delete feedback"),
    };
  }
}
