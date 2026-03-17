export type DashboardStats = {
  users: { total: number; today: number };
  chats: { total: number; today: number };
  projects: { total: number; public: number };
  feedback: { total: number; pending: number };
};

export type RecentAdminUser = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
};

export type RecentAdminChat = {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
  userName: string | null;
};

export type RecentAdminFeedback = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string | null;
  createdAt: Date;
  userName: string | null;
};

export type FeedbackStats = {
  byStatus: Array<{ status: string | null; count: number }>;
  byType: Array<{ type: string | null; count: number }>;
  byPriority: Array<{ priority: string | null; count: number }>;
};

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  userName: string | null;
};

export type AdminChatListItem = {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
  projectId: string | null;
  userName: string | null;
  userEmail: string | null;
};

export type AdminUserDetail = AdminUserListItem & {
  role?: string | null;
  status?: string | null;
  stats: {
    chats: number;
    projects: number;
    feedback: number;
    memories: number;
  };
};

export type AdminProjectDetail = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  visibility: string;
  files: Record<string, string>;
  deploymentUrl: string | null;
  deploymentProvider: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type AdminFeedbackDetail = {
  id: string;
  userId: string;
  type: string;
  category: string | null;
  title: string;
  content: string;
  status: string;
  priority: string | null;
  adminResponse: string | null;
  respondedBy: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  submitter: {
    id: string;
    name: string;
    email: string;
  } | null;
  responder: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type AdminChatDetail = {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
  projectId: string | null;
  userName: string | null;
  userEmail: string | null;
  messages: Array<{
    id: string;
    role: string;
    parts: unknown;
    attachments: unknown;
    createdAt: Date;
  }>;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export interface AdminRepository {
  getDashboardStats(): Promise<DashboardStats>;
  getDashboardActivity(): Promise<{
    recentUsers: RecentAdminUser[];
    recentChats: RecentAdminChat[];
    recentFeedback: RecentAdminFeedback[];
  }>;
  listUsers(options: { page: number; limit: number }): Promise<Paginated<AdminUserListItem>>;
  listProjects(
    options: { page: number; limit: number; type?: string; status?: string; visibility?: string },
  ): Promise<Paginated<AdminProjectListItem>>;
  listChats(options: { page: number; limit: number; userId?: string }): Promise<Paginated<AdminChatListItem>>;
  getFeedbackStats(): Promise<FeedbackStats>;
  getUserDetail(userId: string): Promise<AdminUserDetail | null>;
  getProjectDetail(projectId: string): Promise<AdminProjectDetail | null>;
  getFeedbackDetail(feedbackId: string): Promise<AdminFeedbackDetail | null>;
  getChatDetail(chatId: string): Promise<AdminChatDetail | null>;
}

export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  getDashboardStats() {
    return this.repository.getDashboardStats();
  }

  getDashboardActivity() {
    return this.repository.getDashboardActivity();
  }

  listUsers(page = 1, limit = 20) {
    return this.repository.listUsers({ page, limit });
  }

  listProjects(options: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    visibility?: string;
  }) {
    return this.repository.listProjects({
      page: options.page ?? 1,
      limit: options.limit ?? 20,
      type: options.type,
      status: options.status,
      visibility: options.visibility,
    });
  }

  listChats(options: { page?: number; limit?: number; userId?: string }) {
    return this.repository.listChats({
      page: options.page ?? 1,
      limit: options.limit ?? 20,
      userId: options.userId,
    });
  }

  getFeedbackStats() {
    return this.repository.getFeedbackStats();
  }

  getUserDetail(userId: string) {
    return this.repository.getUserDetail(userId);
  }

  getProjectDetail(projectId: string) {
    return this.repository.getProjectDetail(projectId);
  }

  getFeedbackDetail(feedbackId: string) {
    return this.repository.getFeedbackDetail(feedbackId);
  }

  getChatDetail(chatId: string) {
    return this.repository.getChatDetail(chatId);
  }
}
