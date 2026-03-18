export interface AdminDashboardStatsDto {
  users: { total: number; today: number };
  chats: { total: number; today: number };
  projects: { total: number; public: number };
  feedback: { total: number; pending: number };
}

export interface RecentAdminUserDto {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
}

export interface RecentAdminChatDto {
  id: string;
  title: string;
  createdAt: string;
  userId: string;
  userName: string | null;
}

export interface RecentAdminFeedbackDto {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string | null;
  createdAt: string;
  userName: string | null;
}

export interface AdminDashboardActivityDto {
  recentUsers: RecentAdminUserDto[];
  recentChats: RecentAdminChatDto[];
  recentFeedback: RecentAdminFeedbackDto[];
}

export interface AdminPagedResultDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserListItemDto {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetailDto extends AdminUserListItemDto {
  role?: string | null;
  status?: string | null;
  stats: {
    chats: number;
    projects: number;
    feedback: number;
    memories: number;
  };
}

export interface AdminProjectListItemDto {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string | null;
}

export interface AdminProjectDetailDto {
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
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AdminChatListItemDto {
  id: string;
  title: string;
  createdAt: string;
  userId: string;
  projectId: string | null;
  userName: string | null;
  userEmail: string | null;
}

export interface AdminChatDetailDto {
  id: string;
  title: string;
  createdAt: string;
  userId: string;
  projectId: string | null;
  userName: string | null;
  userEmail: string | null;
  messages: Array<{
    id: string;
    role: string;
    parts: unknown;
    attachments: unknown;
    createdAt: string;
  }>;
}

export interface AdminFeedbackStatsDto {
  byStatus: Array<{ status: string | null; count: number }>;
  byType: Array<{ type: string | null; count: number }>;
  byPriority: Array<{ priority: string | null; count: number }>;
}

export interface AdminFeedbackDetailDto {
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
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
}
