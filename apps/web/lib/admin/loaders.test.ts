import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

vi.mock("next/navigation", () => ({
  notFound,
}));

describe("admin loaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds project list queries and maps date fields", async () => {
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
    );
    expect(result.totalPages).toBe(2);
    expect(result.projects[0].createdAt).toBeInstanceOf(Date);
    expect(result.projects[0].updatedAt).toBeInstanceOf(Date);
  });

  it("loads feedback list and stats with normalized dates", async () => {
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
    );
    expect(apiFetch).toHaveBeenNthCalledWith(2, "/v1/admin/feedback/stats");
    expect(result.feedback[0].createdAt).toBeInstanceOf(Date);
    expect(result.stats.byStatus[0].count).toBe(1);
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
