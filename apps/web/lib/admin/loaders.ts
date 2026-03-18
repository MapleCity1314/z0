import { cache } from "react";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
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

async function getLoaderActorOptions() {
  const actor = await getCurrentUser();

  if (!actor?.id) {
    return undefined;
  }

  return {
    actor: {
      userId: actor.id,
      role: actor.role ?? "user",
    },
  };
}

export async function loadAdminDashboard() {
  const actorOptions = await getLoaderActorOptions();
  const [stats, activity] = await Promise.all([
    apiFetch<AdminDashboardResponse>(
      "/v1/admin/dashboard",
      undefined,
      actorOptions,
    ),
    apiFetch<AdminDashboardActivityResponse>(
      "/v1/admin/dashboard/activity",
      undefined,
      actorOptions,
    ),
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
  const actorOptions = await getLoaderActorOptions();
  const response = await apiFetch<AdminUsersPageResponse>(
    `/v1/admin/users?${buildQuery({ page, limit: 20 })}`,
    undefined,
    actorOptions,
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
    const actorOptions = await getLoaderActorOptions();
    const user = await apiFetch<AdminUserDetailResponse>(
      `/v1/admin/users/${id}`,
      undefined,
      actorOptions,
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
  const actorOptions = await getLoaderActorOptions();
  const response = await apiFetch<AdminChatsPageResponse>(
    `/v1/admin/chats?${buildQuery({
      page,
      limit: 20,
      userId: searchParams.userId,
    })}`,
    undefined,
    actorOptions,
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
    const actorOptions = await getLoaderActorOptions();
    const chat = await apiFetch<AdminChatDetailResponse>(
      `/v1/admin/chats/${id}`,
      undefined,
      actorOptions,
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
  const actorOptions = await getLoaderActorOptions();
  const response = await apiFetch<AdminProjectsPageResponse>(
    `/v1/admin/projects?${buildQuery({
      page,
      limit: 20,
      type: searchParams.type,
      status: searchParams.status,
      visibility: searchParams.visibility,
    })}`,
    undefined,
    actorOptions,
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
    const actorOptions = await getLoaderActorOptions();
    const project = await apiFetch<AdminProjectDetailResponse>(
      `/v1/admin/projects/${id}`,
      undefined,
      actorOptions,
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
  const actorOptions = await getLoaderActorOptions();
  const [feedback, stats] = await Promise.all([
    apiFetch<AdminFeedbackListItemResponse[]>(
      `/v1/admin/feedback?${buildQuery({
        type: searchParams.type,
        status: searchParams.status,
        priority: searchParams.priority,
      })}`,
      undefined,
      actorOptions,
    ),
    apiFetch<AdminFeedbackStatsResponse>(
      "/v1/admin/feedback/stats",
      undefined,
      actorOptions,
    ),
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
    const actorOptions = await getLoaderActorOptions();
    const feedback = await apiFetch<AdminFeedbackDetailResponse>(
      `/v1/admin/feedback/${id}`,
      undefined,
      actorOptions,
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
  const actorOptions = await getLoaderActorOptions();
  const versions = await apiFetch<AdminVersionsListResponse>(
    "/v1/admin/versions",
    undefined,
    actorOptions,
  );

  return versions.map((item) => ({
    ...item,
    createdAt: toDate(item.createdAt),
    updatedAt: toDate(item.updatedAt),
    publishedAt: item.publishedAt ? toDate(item.publishedAt) : null,
  }));
}

export const loadAdminVersionDetail = cache(async (id: string) => {
  try {
    const actorOptions = await getLoaderActorOptions();
    const version = await apiFetch<AdminVersionDetailResponse>(
      `/v1/admin/versions/${id}`,
      undefined,
      actorOptions,
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
