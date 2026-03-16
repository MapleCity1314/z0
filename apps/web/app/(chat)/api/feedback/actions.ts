"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createFeedback,
  getFeedbackById,
  getFeedbackByUserId,
  getAllFeedback,
  updateFeedbackStatus,
  addFeedbackResponse,
  deleteFeedback,
} from "@/lib/db/feedback-queries";
import type { Feedback } from "@/lib/schema";

type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

/**
 * Submit feedback
 */
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const feedback = await createFeedback({
      userId: session.user.id,
      type: data.type,
      category: data.category,
      title: data.title,
      content: data.content,
      priority: data.priority,
      metadata: data.metadata,
      attachments: data.attachments,
    });

    // Revalidate cache
    const { revalidateTag } = await import("next/cache");
    revalidateTag("user-feedback", "max");
    revalidateTag(`user-feedback-${session.user.id}`, "max");

    return {
      success: true,
      message: "Feedback submitted successfully",
      data: feedback,
    };
  } catch (error) {
    console.error("Submit feedback error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to submit feedback",
    };
  }
}

/**
 * Get user's feedback
 */
export async function getUserFeedbackAction(): Promise<ActionResult<Feedback[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const feedbackList = await getFeedbackByUserId(session.user.id);

    return {
      success: true,
      message: "Feedback retrieved successfully",
      data: feedbackList,
    };
  } catch (error) {
    console.error("Get feedback error:", error);
    return {
      success: false,
      message: "Failed to retrieve feedback",
    };
  }
}

/**
 * Get feedback by ID
 */
export async function getFeedbackAction(feedbackId: string): Promise<ActionResult<Feedback>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const feedback = await getFeedbackById(feedbackId);

    if (!feedback) {
      return { success: false, message: "Feedback not found" };
    }

    // Check permissions: owner only (or admin in future)
    if (feedback.userId !== session.user.id) {
      return { success: false, message: "Access denied" };
    }

    return {
      success: true,
      message: "Feedback retrieved successfully",
      data: feedback,
    };
  } catch (error) {
    console.error("Get feedback error:", error);
    return {
      success: false,
      message: "Failed to retrieve feedback",
    };
  }
}

/**
 * Get all feedback (admin only)
 */
export async function getAllFeedbackAction(filters?: {
  type?: string;
  status?: string;
  priority?: string;
}): Promise<ActionResult<Feedback[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // TODO: Add admin role check
    // For now, any authenticated user can view all feedback

    const feedbackList = await getAllFeedback(filters);

    return {
      success: true,
      message: "Feedback retrieved successfully",
      data: feedbackList,
    };
  } catch (error) {
    console.error("Get all feedback error:", error);
    return {
      success: false,
      message: "Failed to retrieve feedback",
    };
  }
}

/**
 * Update feedback status (admin only)
 */
export async function updateFeedbackStatusAction(
  feedbackId: string,
  status: "pending" | "reviewing" | "planned" | "completed" | "rejected"
): Promise<ActionResult<Feedback>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // TODO: Add admin role check

    const updated = await updateFeedbackStatus(feedbackId, status);

    if (!updated) {
      return { success: false, message: "Failed to update feedback status" };
    }

    return {
      success: true,
      message: "Feedback status updated successfully",
      data: updated,
    };
  } catch (error) {
    console.error("Update feedback status error:", error);
    return {
      success: false,
      message: "Failed to update feedback status",
    };
  }
}

/**
 * Add admin response to feedback (admin only)
 */
export async function addFeedbackResponseAction(
  feedbackId: string,
  response: string
): Promise<ActionResult<Feedback>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // TODO: Add admin role check

    const updated = await addFeedbackResponse(feedbackId, session.user.id, response);

    if (!updated) {
      return { success: false, message: "Failed to add response" };
    }

    return {
      success: true,
      message: "Response added successfully",
      data: updated,
    };
  } catch (error) {
    console.error("Add feedback response error:", error);
    return {
      success: false,
      message: "Failed to add response",
    };
  }
}

/**
 * Delete feedback
 */
export async function deleteFeedbackAction(feedbackId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const deleted = await deleteFeedback(feedbackId, session.user.id);

    if (!deleted) {
      return { success: false, message: "Failed to delete feedback" };
    }

    return {
      success: true,
      message: "Feedback deleted successfully",
    };
  } catch (error) {
    console.error("Delete feedback error:", error);
    return {
      success: false,
      message: "Failed to delete feedback",
    };
  }
}
