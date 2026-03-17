import { z } from "zod";
import { DomainError, type DomainResult, fail, ok } from "../common/result";

const feedbackTypeSchema = z.enum(["bug", "feature", "improvement", "other"]);
const feedbackPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
const feedbackStatusSchema = z.enum([
  "pending",
  "reviewing",
  "planned",
  "completed",
  "rejected",
]);

export const createFeedbackInputSchema = z.object({
  userId: z.string().uuid(),
  type: feedbackTypeSchema,
  category: z.string().max(64).optional(),
  title: z.string().min(1).max(256),
  content: z.string().min(1).max(20_000),
  priority: feedbackPrioritySchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  attachments: z.array(z.string()).optional(),
});

export type FeedbackRecord = {
  id: string;
  userId: string;
  type: z.infer<typeof feedbackTypeSchema>;
  category: string | null;
  title: string;
  content: string;
  status: z.infer<typeof feedbackStatusSchema>;
  priority: z.infer<typeof feedbackPrioritySchema>;
  metadata: Record<string, unknown> | null;
  attachments: string[];
  adminResponse: string | null;
  respondedBy: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface FeedbackRepository {
  create(input: z.infer<typeof createFeedbackInputSchema>): Promise<FeedbackRecord>;
  findById(feedbackId: string): Promise<FeedbackRecord | null>;
  listByUserId(userId: string): Promise<FeedbackRecord[]>;
  listAll(filters?: {
    type?: string;
    status?: string;
    priority?: string;
  }): Promise<FeedbackRecord[]>;
  updateStatus(
    feedbackId: string,
    status: z.infer<typeof feedbackStatusSchema>,
  ): Promise<FeedbackRecord | null>;
  addResponse(
    feedbackId: string,
    adminId: string,
    response: string,
  ): Promise<FeedbackRecord | null>;
  delete(feedbackId: string): Promise<boolean>;
}

export class FeedbackService {
  constructor(private readonly repository: FeedbackRepository) {}

  async submit(
    rawInput: z.infer<typeof createFeedbackInputSchema>,
  ): Promise<DomainResult<FeedbackRecord>> {
    return ok(await this.repository.create(createFeedbackInputSchema.parse(rawInput)));
  }

  async getMine(userId: string): Promise<DomainResult<FeedbackRecord[]>> {
    return ok(await this.repository.listByUserId(z.string().uuid().parse(userId)));
  }

  async getOne(userId: string, feedbackId: string): Promise<DomainResult<FeedbackRecord>> {
    const feedback = await this.repository.findById(feedbackId);
    if (!feedback) {
      return fail({ code: "feedback_not_found", message: "Feedback not found" });
    }
    if (feedback.userId !== userId) {
      return fail({ code: "feedback_forbidden", message: "Feedback access denied" });
    }
    return ok(feedback);
  }

  async listAll(filters?: {
    type?: string;
    status?: string;
    priority?: string;
  }): Promise<DomainResult<FeedbackRecord[]>> {
    return ok(await this.repository.listAll(filters));
  }

  async updateStatus(
    feedbackId: string,
    status: z.infer<typeof feedbackStatusSchema>,
  ): Promise<DomainResult<FeedbackRecord>> {
    const updated = await this.repository.updateStatus(feedbackId, status);
    if (!updated) {
      return fail({
        code: "feedback_update_failed",
        message: "Failed to update feedback status",
      });
    }
    return ok(updated);
  }

  async respond(
    feedbackId: string,
    adminId: string,
    response: string,
  ): Promise<DomainResult<FeedbackRecord>> {
    if (!response.trim()) {
      return fail({
        code: "validation_error",
        message: "Feedback response is required",
      });
    }
    const updated = await this.repository.addResponse(feedbackId, adminId, response.trim());
    if (!updated) {
      return fail({
        code: "feedback_update_failed",
        message: "Failed to add feedback response",
      });
    }
    return ok(updated);
  }

  async remove(userId: string, feedbackId: string): Promise<DomainResult<{ deleted: true }>> {
    const feedback = await this.repository.findById(feedbackId);
    if (!feedback) {
      return fail({ code: "feedback_not_found", message: "Feedback not found" });
    }
    if (feedback.userId !== userId) {
      return fail({ code: "feedback_forbidden", message: "Feedback access denied" });
    }
    await this.repository.delete(feedbackId);
    return ok({ deleted: true });
  }
}
