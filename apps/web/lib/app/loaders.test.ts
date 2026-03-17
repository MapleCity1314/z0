import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

describe("app loaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps user projects into ui-friendly records", async () => {
    apiFetch.mockResolvedValueOnce([
      {
        id: "p1",
        userId: "u1",
        name: "Alpha",
        description: null,
        type: "react",
        status: "draft",
        visibility: "private",
        files: {},
        tags: [],
        deploymentUrl: null,
        deploymentProvider: null,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        publishedAt: null,
        lastDeployedAt: null,
      },
    ]);

    const { loadUserProjectsPage } = await import("./loaders");
    const result = await loadUserProjectsPage();

    expect(apiFetch).toHaveBeenCalledWith("/v1/projects");
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].likes).toBe(0);
    expect(result[0].views).toBe(0);
  });

  it("maps published versions to date-aware records", async () => {
    apiFetch.mockResolvedValueOnce([
      {
        id: "v1",
        version: "1.0.0",
        title: "Launch",
        description: null,
        type: "major",
        features: [],
        improvements: [],
        bugFixes: [],
        breaking: [],
        highlights: [],
        migration: null,
        status: "published",
        isLatest: true,
        publishedBy: "u1",
        downloadUrl: null,
        docsUrl: null,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        publishedAt: "2026-03-03T00:00:00.000Z",
      },
    ]);

    const { loadPublishedVersions } = await import("./loaders");
    const result = await loadPublishedVersions(20);

    expect(apiFetch).toHaveBeenCalledWith("/v1/versions/published?limit=20");
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].publishedAt).toBeInstanceOf(Date);
  });
});
