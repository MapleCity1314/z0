import { cache } from "react";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type {
  AdminChatDetailResponse,
  AdminChatsPageResponse,
  AdminDashboardActivityResponse,
  AdminDashboardResponse,
  AdminFeedbackDetailResponse,
  AdminFeedbackListItemResponse,
  AdminFeedbackStatsResponse,
  AdminProjectDetailResponse,
  AdminProjectsPageResponse,
  AdminUserDetailResponse,
  AdminUsersPageResponse,
  AdminVersionDetailResponse,
  AdminVersionsListResponse,
} from "@/lib/admin/contracts";

function toDate(value: string) {
  return new Date(value);
}

function toPositivePage(page?: string) {
  const parsed = Number(page);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildQuery(
  params: Record<string, string | number | null | undefined>,
) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

export async function loadAdminDashboard() {
  const [stats, activity] = await Promise.all([
    apiFetch<AdminDashboardResponse>("/v1/admin/dashboard"),
    apiFetch<AdminDashboardActivityResponse>("/v1/admin/dashboard/activity"),
  ]);

  return {
    stats,
    activity: {
      recentUsers: activity.recentUsers.map((item) => ({
        ...item,
        createdAt: toDate(item.createdAt),
      })),
      recentChats: activity.recentChats.map((item) => ({
        ...item,
        createdAt: toDate(item.createdAt),
      })),
      recentFeedback: activity.recentFeedback.map((item) => ({
        ...item,
        createdAt: toDate(item.createdAt),
      })),
    },
  };
}

export async function loadAdminUsersPage(searchParams: { page?: string }) {
  const page = toPositivePage(searchParams.page);
  const response = await apiFetch<AdminUsersPageResponse>(
    `/v1/admin/users?${buildQuery({ page, limit: 20 })}`,
  );

  return {
    page,
    total: response.total,
    totalPages: Math.ceil(response.total / response.limit),
    users: response.items.map((item) => ({
      ...item,
      createdAt: toDate(item.createdAt),
      updatedAt: toDate(item.updatedAt),
    })),
  };
}

export const loadAdminUserDetail = cache(async (id: string) => {
  try {
    const user = await apiFetch<AdminUserDetailResponse>(
      `/v1/admin/users/${id}`,
    );
    return {
      ...user,
      createdAt: toDate(user.createdAt),
      updatedAt: toDate(user.updatedAt),
    };
  } catch {
    notFound();
  }
});

export async function loadAdminChatsPage(searchParams: {
  page?: string;
  userId?: string;
}) {
  const page = toPositivePage(searchParams.page);
  const response = await apiFetch<AdminChatsPageResponse>(
    `/v1/admin/chats?${buildQuery({
      page,
      limit: 20,
      userId: searchParams.userId,
    })}`,
  );

  return {
    page,
    total: response.total,
    totalPages: Math.ceil(response.total / response.limit),
    chats: response.items.map((item) => ({
      ...item,
      createdAt: toDate(item.createdAt),
    })),
  };
}

export const loadAdminChatDetail = cache(async (id: string) => {
  try {
    const chat = await apiFetch<AdminChatDetailResponse>(
      `/v1/admin/chats/${id}`,
    );
    return {
      ...chat,
      createdAt: toDate(chat.createdAt),
      messages: chat.messages.map((message) => ({
        ...message,
        createdAt: toDate(message.createdAt),
      })),
    };
  } catch {
    notFound();
  }
});

export async function loadAdminProjectsPage(searchParams: {
  page?: string;
  type?: string;
  status?: string;
  visibility?: string;
}) {
  const page = toPositivePage(searchParams.page);
  const response = await apiFetch<AdminProjectsPageResponse>(
    `/v1/admin/projects?${buildQuery({
      page,
      limit: 20,
      type: searchParams.type,
      status: searchParams.status,
      visibility: searchParams.visibility,
    })}`,
  );

  return {
    page,
    total: response.total,
    totalPages: Math.ceil(response.total / response.limit),
    projects: response.items.map((item) => ({
      ...item,
      createdAt: toDate(item.createdAt),
      updatedAt: toDate(item.updatedAt),
    })),
  };
}

export const loadAdminProjectDetail = cache(async (id: string) => {
  try {
    const project = await apiFetch<AdminProjectDetailResponse>(
      `/v1/admin/projects/${id}`,
    );
    return {
      ...project,
      createdAt: toDate(project.createdAt),
      updatedAt: toDate(project.updatedAt),
      publishedAt: project.publishedAt ? toDate(project.publishedAt) : null,
    };
  } catch {
    notFound();
  }
});

export async function loadAdminFeedbackPage(searchParams: {
  type?: string;
  status?: string;
  priority?: string;
}) {
  const [feedback, stats] = await Promise.all([
    apiFetch<AdminFeedbackListItemResponse[]>(
      `/v1/admin/feedback?${buildQuery({
        type: searchParams.type,
        status: searchParams.status,
        priority: searchParams.priority,
      })}`,
    ),
    apiFetch<AdminFeedbackStatsResponse>("/v1/admin/feedback/stats"),
  ]);

  return {
    stats,
    feedback: feedback.map((item) => ({
      ...item,
      createdAt: toDate(item.createdAt),
      updatedAt: toDate(item.updatedAt),
      respondedAt: item.respondedAt ? toDate(item.respondedAt) : null,
    })),
  };
}

export const loadAdminFeedbackDetail = cache(async (id: string) => {
  try {
    const feedback = await apiFetch<AdminFeedbackDetailResponse>(
      `/v1/admin/feedback/${id}`,
    );
    return {
      ...feedback,
      createdAt: toDate(feedback.createdAt),
      updatedAt: toDate(feedback.updatedAt),
      respondedAt: feedback.respondedAt ? toDate(feedback.respondedAt) : null,
    };
  } catch {
    notFound();
  }
});

export async function loadAdminVersionsPage() {
  const versions =
    await apiFetch<AdminVersionsListResponse>("/v1/admin/versions");

  return versions.map((item) => ({
    ...item,
    createdAt: toDate(item.createdAt),
    updatedAt: toDate(item.updatedAt),
    publishedAt: item.publishedAt ? toDate(item.publishedAt) : null,
  }));
}

export const loadAdminVersionDetail = cache(async (id: string) => {
  try {
    const version = await apiFetch<AdminVersionDetailResponse>(
      `/v1/admin/versions/${id}`,
    );
    return {
      ...version,
      createdAt: toDate(version.createdAt),
      updatedAt: toDate(version.updatedAt),
      publishedAt: version.publishedAt ? toDate(version.publishedAt) : null,
    };
  } catch {
    notFound();
  }
});

export const adminLoaderUtils = {
  buildQuery,
  toPositivePage,
};
