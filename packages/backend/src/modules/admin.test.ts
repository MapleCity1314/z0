import { describe, expect, it, vi } from "vitest";
import { AdminService, type AdminRepository } from "./admin";

function makeRepository(): AdminRepository {
  return {
    getDashboardStats: vi.fn(async () => ({
      users: { total: 10, today: 1 },
      chats: { total: 20, today: 3 },
      projects: { total: 5, public: 2 },
      feedback: { total: 8, pending: 4 },
    })),
    getDashboardActivity: vi.fn(async () => ({
      recentUsers: [],
      recentChats: [],
      recentFeedback: [],
    })),
    listUsers: vi.fn(async ({ page, limit }) => ({
      items: [],
      total: 0,
      page,
      limit,
    })),
    listProjects: vi.fn(async ({ page, limit }) => ({
      items: [],
      total: 0,
      page,
      limit,
    })),
    listChats: vi.fn(async ({ page, limit }) => ({
      items: [],
      total: 0,
      page,
      limit,
    })),
    getFeedbackStats: vi.fn(async () => ({
      byStatus: [],
      byType: [],
      byPriority: [],
    })),
    getUserDetail: vi.fn(async () => null),
    getProjectDetail: vi.fn(async () => null),
    getFeedbackDetail: vi.fn(async () => null),
    getChatDetail: vi.fn(async () => null),
  };
}

describe("AdminService", () => {
  it("returns dashboard stats", async () => {
    const service = new AdminService(makeRepository());
    const stats = await service.getDashboardStats();

    expect(stats.feedback.pending).toBe(4);
  });

  it("uses stable default pagination", async () => {
    const service = new AdminService(makeRepository());
    const result = await service.listProjects({});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
