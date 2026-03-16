import type { Feedback } from "@/lib/schema";

/**
 * Feedback type enum
 */
export type FeedbackType = "bug" | "feature" | "improvement" | "other";

/**
 * Feedback category enum
 */
export type FeedbackCategory = 
  | "ui" 
  | "performance" 
  | "ai" 
  | "deployment" 
  | "authentication"
  | "chat"
  | "project"
  | "executor"
  | "other";

/**
 * Feedback status enum
 */
export type FeedbackStatus = 
  | "pending" 
  | "reviewing" 
  | "planned" 
  | "completed" 
  | "rejected";

/**
 * Feedback priority enum
 */
export type FeedbackPriority = "low" | "medium" | "high" | "critical";

/**
 * Feedback metadata
 */
export interface FeedbackMetadata {
  browser?: string;
  os?: string;
  screenResolution?: string;
  userAgent?: string;
  url?: string;
  timestamp?: string;
  errorStack?: string;
  consoleLog?: string[];
}

/**
 * Feedback submission input
 */
export interface SubmitFeedbackInput {
  type: FeedbackType;
  category?: FeedbackCategory;
  title: string;
  content: string;
  priority?: FeedbackPriority;
  metadata?: FeedbackMetadata;
  attachments?: string[];
}

/**
 * Feedback with user info
 */
export interface FeedbackWithUser extends Feedback {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

/**
 * Feedback filters
 */
export interface FeedbackFilters {
  type?: FeedbackType;
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  category?: FeedbackCategory;
}

/**
 * Feedback statistics
 */
export interface FeedbackStats {
  total: number;
  pending: number;
  reviewing: number;
  planned: number;
  completed: number;
  rejected: number;
  byType: Record<FeedbackType, number>;
  byPriority: Record<FeedbackPriority, number>;
}
