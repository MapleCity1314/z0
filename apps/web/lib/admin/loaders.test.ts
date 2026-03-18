import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
const getCurrentUser = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser,
}));

vi.mock("next/navigation", () => ({
  notFound,
}));

describe("admin loaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({
      id: "admin-1",
      role: "admin",
    });
  });

  it("builds project list queries, passes actor context, and maps date fields", async () => {
    apiFetch.mockResolvedValueOnce({
      items: [
        {
          id: "p1",
          name: "Alpha",
          description: null,
          type: "react",
          status: "draft",
          visibility: "private",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
          userId: "u1",
          userName: "Ada",
        },
      ],
      total: 21,
      limit: 20,
      page: 2,
    });

    const { loadAdminProjectsPage } = await import("./loaders");
    const result = await loadAdminProjectsPage({
      page: "2",
      type: "react",
      status: "draft",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/v1/admin/projects?page=2&limit=20&type=react&status=draft",
      undefined,
      {
        actor: {
          userId: "admin-1",
          role: "admin",
        },
      },
    );
    expect(result.totalPages).toBe(2);
    expect(result.projects[0].createdAt).toBeInstanceOf(Date);
    expect(result.projects[0].updatedAt).toBeInstanceOf(Date);
  });

  it("loads feedback list and stats with actor context and normalized dates", async () => {
    apiFetch
      .mockResolvedValueOnce([
        {
          id: "f1",
          userId: "u1",
          type: "bug",
          category: null,
          title: "Broken layout",
          content: "Sidebar overlaps",
          status: "pending",
          priority: "high",
          metadata: null,
          attachments: [],
          adminResponse: null,
          respondedBy: null,
          respondedAt: null,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce({
        byStatus: [{ status: "pending", count: 1 }],
        byType: [{ type: "bug", count: 1 }],
        byPriority: [{ priority: "high", count: 1 }],
      });

    const { loadAdminFeedbackPage } = await import("./loaders");
    const result = await loadAdminFeedbackPage({
      status: "pending",
    });

    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      "/v1/admin/feedback?status=pending",
      undefined,
      {
        actor: {
          userId: "admin-1",
          role: "admin",
        },
      },
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      "/v1/admin/feedback/stats",
      undefined,
      {
        actor: {
          userId: "admin-1",
          role: "admin",
        },
      },
    );
    expect(result.feedback[0].createdAt).toBeInstanceOf(Date);
    expect(result.stats.byStatus[0].count).toBe(1);
  });

  it("falls back to legacy apiFetch auth when no current actor is available", async () => {
    getCurrentUser.mockResolvedValueOnce(null);
    apiFetch.mockResolvedValueOnce({
      items: [],
      total: 0,
      limit: 20,
      page: 1,
    });

    const { loadAdminUsersPage } = await import("./loaders");
    await loadAdminUsersPage({});

    expect(apiFetch).toHaveBeenCalledWith(
      "/v1/admin/users?page=1&limit=20",
      undefined,
      undefined,
    );
  });

  it("converts missing admin detail responses into notFound()", async () => {
    apiFetch.mockRejectedValueOnce(new Error("404"));

    const { loadAdminVersionDetail } = await import("./loaders");

    await expect(loadAdminVersionDetail("missing")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFound).toHaveBeenCalled();
  });
});
