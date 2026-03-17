import { desc, eq } from "drizzle-orm";
import {
  feedback,
  type FeedbackRecord,
  type FeedbackRepository,
} from "@z0/backend";
import { db, withPredicates } from "./shared";

export class DrizzleFeedbackRepository implements FeedbackRepository {
  create(input: {
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
    return db
      .insert(feedback)
      .values({
        userId: input.userId,
        type: input.type,
        category: input.category ?? null,
        title: input.title,
        content: input.content,
        status: "pending",
        priority: input.priority ?? "medium",
        metadata: input.metadata ?? null,
        attachments: input.attachments ?? [],
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .then((rows) => rows[0] as FeedbackRecord);
  }

  findById(feedbackId: string) {
    return db
      .select()
      .from(feedback)
      .where(eq(feedback.id, feedbackId))
      .limit(1)
      .then((rows) => (rows[0] as FeedbackRecord | undefined) ?? null);
  }

  listByUserId(userId: string) {
    return db
      .select()
      .from(feedback)
      .where(eq(feedback.userId, userId))
      .orderBy(desc(feedback.createdAt)) as Promise<FeedbackRecord[]>;
  }

  listAll(filters?: { type?: string; status?: string; priority?: string }) {
    const predicates = [];
    if (filters?.type) predicates.push(eq(feedback.type, filters.type));
    if (filters?.status) predicates.push(eq(feedback.status, filters.status));
    if (filters?.priority)
      predicates.push(eq(feedback.priority, filters.priority));

    return withPredicates(predicates, (whereClause) => {
      const query = db.select().from(feedback);
      return (whereClause ? query.where(whereClause) : query).orderBy(
        desc(feedback.createdAt),
      ) as Promise<FeedbackRecord[]>;
    });
  }

  updateStatus(
    feedbackId: string,
    status: "pending" | "reviewing" | "planned" | "completed" | "rejected",
  ) {
    return db
      .update(feedback)
      .set({ status, updatedAt: new Date() })
      .where(eq(feedback.id, feedbackId))
      .returning()
      .then((rows) => (rows[0] as FeedbackRecord | undefined) ?? null);
  }

  addResponse(feedbackId: string, adminId: string, response: string) {
    const now = new Date();
    return db
      .update(feedback)
      .set({
        adminResponse: response,
        respondedBy: adminId,
        respondedAt: now,
        updatedAt: now,
      })
      .where(eq(feedback.id, feedbackId))
      .returning()
      .then((rows) => (rows[0] as FeedbackRecord | undefined) ?? null);
  }

  async delete(feedbackId: string) {
    await db.delete(feedback).where(eq(feedback.id, feedbackId));
    return true;
  }
}
