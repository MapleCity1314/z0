import { db } from "./index";
import { user, chat, message, project, feedback, versionUpdate, memory } from "@/lib/schema";
import { eq, desc, count, sql, and, gte, lte } from "drizzle-orm";

// Dashboard Statistics
export async function getDashboardStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    todayUsers,
    totalChats,
    todayChats,
    totalProjects,
    publicProjects,
    totalFeedback,
    pendingFeedback,
  ] = await Promise.all([
    db.select({ count: count() }).from(user),
    db.select({ count: count() }).from(user).where(gte(user.createdAt, today)),
    db.select({ count: count() }).from(chat),
    db.select({ count: count() }).from(chat).where(gte(chat.createdAt, today)),
    db.select({ count: count() }).from(project),
    db.select({ count: count() }).from(project).where(eq(project.visibility, "public")),
    db.select({ count: count() }).from(feedback),
    db.select({ count: count() }).from(feedback).where(eq(feedback.status, "pending")),
  ]);

  return {
    users: {
      total: totalUsers[0].count,
      today: todayUsers[0].count,
    },
    chats: {
      total: totalChats[0].count,
      today: todayChats[0].count,
    },
    projects: {
      total: totalProjects[0].count,
      public: publicProjects[0].count,
    },
    feedback: {
      total: totalFeedback[0].count,
      pending: pendingFeedback[0].count,
    },
  };
}

// Recent Activity
export async function getRecentUsers(limit = 5) {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(limit);
}

export async function getRecentChats(limit = 5) {
  return db
    .select({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      userId: chat.userId,
      userName: user.name,
    })
    .from(chat)
    .leftJoin(user, eq(chat.userId, user.id))
    .orderBy(desc(chat.createdAt))
    .limit(limit);
}

export async function getRecentFeedback(limit = 5) {
  return db
    .select({
      id: feedback.id,
      title: feedback.title,
      type: feedback.type,
      status: feedback.status,
      priority: feedback.priority,
      createdAt: feedback.createdAt,
      userName: user.name,
    })
    .from(feedback)
    .leftJoin(user, eq(feedback.userId, user.id))
    .orderBy(desc(feedback.createdAt))
    .limit(limit);
}

// User Management
export async function getAllUsers(options?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const offset = (page - 1) * limit;

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count: total }] = await db.select({ count: count() }).from(user);

  return { users, total, page, limit };
}

export async function getUserWithStats(userId: string) {
  const [userData] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!userData) return null;

  const [chatCount, projectCount, feedbackCount, memoryCount] = await Promise.all([
    db.select({ count: count() }).from(chat).where(eq(chat.userId, userId)),
    db.select({ count: count() }).from(project).where(eq(project.userId, userId)),
    db.select({ count: count() }).from(feedback).where(eq(feedback.userId, userId)),
    db.select({ count: count() }).from(memory).where(eq(memory.userId, userId)),
  ]);

  return {
    ...userData,
    stats: {
      chats: chatCount[0].count,
      projects: projectCount[0].count,
      feedback: feedbackCount[0].count,
      memories: memoryCount[0].count,
    },
  };
}

// Chat Management
export async function getAllChats(options?: {
  page?: number;
  limit?: number;
  userId?: string;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const offset = (page - 1) * limit;

  let query = db
    .select({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      userId: chat.userId,
      projectId: chat.projectId,
      userName: user.name,
      userEmail: user.email,
    })
    .from(chat)
    .leftJoin(user, eq(chat.userId, user.id))
    .orderBy(desc(chat.createdAt))
    .limit(limit)
    .offset(offset);

  const chats = await query;
  const [{ count: total }] = await db.select({ count: count() }).from(chat);

  return { chats, total, page, limit };
}

export async function getChatWithMessages(chatId: string) {
  const [chatData] = await db
    .select({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      userId: chat.userId,
      projectId: chat.projectId,
      userName: user.name,
      userEmail: user.email,
    })
    .from(chat)
    .leftJoin(user, eq(chat.userId, user.id))
    .where(eq(chat.id, chatId))
    .limit(1);

  if (!chatData) return null;

  const messages = await db
    .select()
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(message.createdAt);

  return { ...chatData, messages };
}

// Project Management
export async function getAllProjects(options?: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  visibility?: string;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const offset = (page - 1) * limit;

  const projects = await db
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      visibility: project.visibility,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      userId: project.userId,
      userName: user.name,
    })
    .from(project)
    .leftJoin(user, eq(project.userId, user.id))
    .orderBy(desc(project.updatedAt))
    .limit(limit)
    .offset(offset);

  const [{ count: total }] = await db.select({ count: count() }).from(project);

  return { projects, total, page, limit };
}

// Feedback Statistics
export async function getFeedbackStats() {
  const [byStatus, byType, byPriority] = await Promise.all([
    db
      .select({
        status: feedback.status,
        count: count(),
      })
      .from(feedback)
      .groupBy(feedback.status),
    db
      .select({
        type: feedback.type,
        count: count(),
      })
      .from(feedback)
      .groupBy(feedback.type),
    db
      .select({
        priority: feedback.priority,
        count: count(),
      })
      .from(feedback)
      .groupBy(feedback.priority),
  ]);

  return { byStatus, byType, byPriority };
}
