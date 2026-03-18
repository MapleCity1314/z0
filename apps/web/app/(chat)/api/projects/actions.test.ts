import { beforeEach, describe, expect, it, vi } from "vitest";

class MockApiClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

const requireAuth = vi.fn();
const apiFetch = vi.fn();

vi.mock("@/lib/session", () => ({
  requireAuth,
}));

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

vi.mock("@/lib/auth-errors", () => ({
  getActionErrorMessage: vi.fn(
    (error: unknown, fallback: string) =>
      error instanceof Error && error.message ? error.message : fallback,
  ),
}));

describe("chat project actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      role: "user",
    });
  });

  it("passes actor context when loading user projects", async () => {
    apiFetch.mockResolvedValueOnce([]);

    const { getUserProjectsAction } = await import("./actions");
    const result = await getUserProjectsAction();

    expect(result).toEqual({
      success: true,
      message: "Projects retrieved successfully",
      data: [],
    });
    expect(apiFetch).toHaveBeenCalledWith("/v1/projects", undefined, {
      actor: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        role: "user",
      },
    });
  });

  it("returns normalized api error messages", async () => {
    apiFetch.mockRejectedValueOnce(
      new MockApiClientError(403, "You do not have access to this resource."),
    );

    const { getProjectAction } = await import("./actions");
    const result = await getProjectAction("prj-1");

    expect(result).toEqual({
      success: false,
      message: "You do not have access to this resource.",
    });
  });
});
