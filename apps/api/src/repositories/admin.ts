import { asc, count, desc, eq, gte } from "drizzle-orm";
import {
  type AdminChatDetail,
  type AdminChatListItem,
  type AdminFeedbackDetail,
  type AdminProjectDetail,
  type AdminRepository,
  type AdminUserDetail,
  chat,
  feedback,
  memory,
  message,
  project,
  type FeedbackRecord,
  user,
} from "@z0/backend";
import { db, withPredicates } from "./shared";

export class DrizzleAdminRepository implements AdminRepository {
  async getDashboardStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
      db
        .select({ count: count() })
        .from(user)
        .where(gte(user.createdAt, today)),
      db.select({ count: count() }).from(chat),
      db
        .select({ count: count() })
        .from(chat)
        .where(gte(chat.createdAt, today)),
      db.select({ count: count() }).from(project),
      db
        .select({ count: count() })
        .from(project)
        .where(eq(project.visibility, "public")),
      db.select({ count: count() }).from(feedback),
      db
        .select({ count: count() })
        .from(feedback)
        .where(eq(feedback.status, "pending")),
    ]);

    return {
      users: {
        total: Number(totalUsers[0]?.count ?? 0),
        today: Number(todayUsers[0]?.count ?? 0),
      },
      chats: {
        total: Number(totalChats[0]?.count ?? 0),
        today: Number(todayChats[0]?.count ?? 0),
      },
      projects: {
        total: Number(totalProjects[0]?.count ?? 0),
        public: Number(publicProjects[0]?.count ?? 0),
      },
      feedback: {
        total: Number(totalFeedback[0]?.count ?? 0),
        pending: Number(pendingFeedback[0]?.count ?? 0),
      },
    };
  }

  async getDashboardActivity() {
    const [recentUsers, recentChats, recentFeedback] = await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          createdAt: user.createdAt,
        })
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(5),
      db
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
        .limit(5),
      db
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
        .limit(5),
    ]);

    return { recentUsers, recentChats, recentFeedback };
  }

  async listUsers(options: { page: number; limit: number }) {
    const offset = (options.page - 1) * options.limit;
    const [rows, totals] = await Promise.all([
      db
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
        .limit(options.limit)
        .offset(offset),
      db.select({ count: count() }).from(user),
    ]);

    return {
      items: rows,
      total: Number(totals[0]?.count ?? 0),
      page: options.page,
      limit: options.limit,
    };
  }

  async listProjects(options: {
    page: number;
    limit: number;
    type?: string;
    status?: string;
    visibility?: string;
  }) {
    const offset = (options.page - 1) * options.limit;
    const predicates = [];
    if (options.type) predicates.push(eq(project.type, options.type));
    if (options.status) predicates.push(eq(project.status, options.status));
    if (options.visibility)
      predicates.push(eq(project.visibility, options.visibility));

    const [rows, totals] = await Promise.all([
      withPredicates(predicates, (whereClause) => {
        const query = db
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
          .leftJoin(user, eq(project.userId, user.id));
        return (whereClause ? query.where(whereClause) : query)
          .orderBy(desc(project.updatedAt))
          .limit(options.limit)
          .offset(offset);
      }),
      withPredicates(predicates, (whereClause) => {
        const query = db.select({ count: count() }).from(project);
        return whereClause ? query.where(whereClause) : query;
      }),
    ]);

    return {
      items: rows,
      total: Number(totals[0]?.count ?? 0),
      page: options.page,
      limit: options.limit,
    };
  }

  async listChats(options: { page: number; limit: number; userId?: string }) {
    const offset = (options.page - 1) * options.limit;
    const predicates = options.userId ? [eq(chat.userId, options.userId)] : [];

    const [rows, totals] = await Promise.all([
      withPredicates(predicates, (whereClause) => {
        const query = db
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
          .leftJoin(user, eq(chat.userId, user.id));
        return (whereClause ? query.where(whereClause) : query)
          .orderBy(desc(chat.createdAt))
          .limit(options.limit)
          .offset(offset) as Promise<AdminChatListItem[]>;
      }),
      withPredicates(predicates, (whereClause) => {
        const query = db.select({ count: count() }).from(chat);
        return whereClause ? query.where(whereClause) : query;
      }),
    ]);

    return {
      items: rows,
      total: Number(totals[0]?.count ?? 0),
      page: options.page,
      limit: options.limit,
    };
  }

  async getFeedbackStats() {
    const items = (await db.select().from(feedback)) as FeedbackRecord[];
    return {
      byStatus: countFeedbackValues(items, "status"),
      byType: countFeedbackValues(items, "type"),
      byPriority: countFeedbackValues(items, "priority"),
    };
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail | null> {
    const [profile, chatCount, projectCount, feedbackCount, memoryCount] =
      await Promise.all([
        db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: user.role,
            status: user.status,
          })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1),
        db.select({ count: count() }).from(chat).where(eq(chat.userId, userId)),
        db
          .select({ count: count() })
          .from(project)
          .where(eq(project.userId, userId)),
        db
          .select({ count: count() })
          .from(feedback)
          .where(eq(feedback.userId, userId)),
        db
          .select({ count: count() })
          .from(memory)
          .where(eq(memory.userId, userId)),
      ]);

    const item = profile[0];
    if (!item) {
      return null;
    }

    return {
      ...item,
      stats: {
        chats: Number(chatCount[0]?.count ?? 0),
        projects: Number(projectCount[0]?.count ?? 0),
        feedback: Number(feedbackCount[0]?.count ?? 0),
        memories: Number(memoryCount[0]?.count ?? 0),
      },
    };
  }

  async getProjectDetail(
    projectId: string,
  ): Promise<AdminProjectDetail | null> {
    const rows = await db
      .select({
        id: project.id,
        userId: project.userId,
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status,
        visibility: project.visibility,
        files: project.files,
        deploymentUrl: project.deploymentUrl,
        deploymentProvider: project.deploymentProvider,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        publishedAt: project.publishedAt,
        ownerId: user.id,
        ownerName: user.name,
        ownerEmail: user.email,
      })
      .from(project)
      .leftJoin(user, eq(project.userId, user.id))
      .where(eq(project.id, projectId))
      .limit(1);

    const item = rows[0];
    if (!item) {
      return null;
    }

    return {
      id: item.id,
      userId: item.userId,
      name: item.name,
      description: item.description,
      type: item.type,
      status: item.status,
      visibility: item.visibility,
      files: (item.files ?? {}) as Record<string, string>,
      deploymentUrl: item.deploymentUrl,
      deploymentProvider: item.deploymentProvider,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      publishedAt: item.publishedAt,
      owner: item.ownerId
        ? {
            id: item.ownerId,
            name: item.ownerName ?? "Unknown",
            email: item.ownerEmail ?? "",
          }
        : null,
    };
  }

  async getFeedbackDetail(
    feedbackId: string,
  ): Promise<AdminFeedbackDetail | null> {
    const rows = await db
      .select()
      .from(feedback)
      .where(eq(feedback.id, feedbackId))
      .limit(1);
    const item = rows[0];
    if (!item) {
      return null;
    }

    const [submitterRows, responderRows] = await Promise.all([
      db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, item.userId))
        .limit(1),
      item.respondedBy
        ? db
            .select({ id: user.id, name: user.name, email: user.email })
            .from(user)
            .where(eq(user.id, item.respondedBy))
            .limit(1)
        : Promise.resolve([]),
    ]);

    return {
      id: item.id,
      userId: item.userId,
      type: item.type,
      category: item.category,
      title: item.title,
      content: item.content,
      status: item.status,
      priority: item.priority,
      adminResponse: item.adminResponse,
      respondedBy: item.respondedBy,
      respondedAt: item.respondedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      submitter: submitterRows[0] ?? null,
      responder: responderRows[0] ?? null,
    };
  }

  async getChatDetail(chatId: string): Promise<AdminChatDetail | null> {
    const [chatRows, messageRows] = await Promise.all([
      db
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
        .limit(1),
      db
        .select({
          id: message.id,
          role: message.role,
          parts: message.parts,
          attachments: message.attachments,
          createdAt: message.createdAt,
        })
        .from(message)
        .where(eq(message.chatId, chatId))
        .orderBy(asc(message.createdAt)),
    ]);

    const item = chatRows[0];
    if (!item) {
      return null;
    }

    return {
      ...item,
      messages: messageRows.map((entry) => ({
        id: entry.id,
        role: entry.role,
        parts: entry.parts,
        attachments: entry.attachments,
        createdAt: entry.createdAt,
      })),
    };
  }
}

function countFeedbackValues<K extends "status" | "type" | "priority">(
  items: FeedbackRecord[],
  field: K,
): Array<{ [P in K]: FeedbackRecord[P] } & { count: number }> {
  const totals = new Map<FeedbackRecord[K], number>();

  for (const item of items) {
    const key = item[field];
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }

  return Array.from(totals.entries()).map(([key, value]) => ({
    [field]: key,
    count: value,
  })) as Array<{ [P in K]: FeedbackRecord[P] } & { count: number }>;
}
