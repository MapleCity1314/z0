// lib/schema/feedback.ts
import { z } from "zod";

export const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "improvement", "other"]),
  category: z.string().optional(),
  title: z.string().min(5, "Title must be at least 5 characters"),
  content: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export type FeedbackFormValues = z.infer<typeof feedbackSchema>;