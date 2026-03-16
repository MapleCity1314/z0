import { db } from "./index";
import { feedback, type Feedback } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Create feedback
 */
export async function createFeedback(data: {
  userId: string;
  type: "bug" | "feature" | "improvement" | "other";
  category?: string;
  title: string;
  content: string;
  priority?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
  attachments?: string[];
}) {
  const now = new Date();

  const [newFeedback] = await db
    .insert(feedback)
    .values({
      userId: data.userId,
      type: data.type,
      category: data.category,
      title: data.title,
      content: data.content,
      status: "pending",
      priority: data.priority || "medium",
      metadata: data.metadata || null,
      attachments: data.attachments || [],
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return newFeedback;
}

/**
 * Get feedback by ID
 */
export async function getFeedbackById(feedbackId: string): Promise<Feedback | null> {
  const [result] = await db
    .select()
    .from(feedback)
    .where(eq(feedback.id, feedbackId))
    .limit(1);

  return result || null;
}

/**
 * Get all feedback by user
 */
export async function getFeedbackByUserId(userId: string): Promise<Feedback[]> {
  return db
    .select()
    .from(feedback)
    .where(eq(feedback.userId, userId))
    .orderBy(desc(feedback.createdAt));
}

/**
 * Get all feedback (admin)
 */
export async function getAllFeedback(filters?: {
  type?: string;
  status?: string;
  priority?: string;
}): Promise<Feedback[]> {
  let query = db.select().from(feedback);

  if (filters?.type) {
    query = query.where(eq(feedback.type, filters.type)) as typeof query;
  }
  if (filters?.status) {
    query = query.where(eq(feedback.status, filters.status)) as typeof query;
  }
  if (filters?.priority) {
    query = query.where(eq(feedback.priority, filters.priority)) as typeof query;
  }

  return query.orderBy(desc(feedback.createdAt));
}

/**
 * Update feedback status
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: "pending" | "reviewing" | "planned" | "completed" | "rejected"
): Promise<Feedback | null> {
  const [updated] = await db
    .update(feedback)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(feedback.id, feedbackId))
    .returning();

  return updated || null;
}

/**
 * Add admin response to feedback
 */
export async function addFeedbackResponse(
  feedbackId: string,
  adminId: string,
  response: string
): Promise<Feedback | null> {
  const now = new Date();

  const [updated] = await db
    .update(feedback)
    .set({
      adminResponse: response,
      respondedBy: adminId,
      respondedAt: now,
      updatedAt: now,
    })
    .where(eq(feedback.id, feedbackId))
    .returning();

  return updated || null;
}

/**
 * Delete feedback
 */
export async function deleteFeedback(feedbackId: string, userId: string): Promise<boolean> {
  await db
    .delete(feedback)
    .where(and(eq(feedback.id, feedbackId), eq(feedback.userId, userId)));

  return true;
}
