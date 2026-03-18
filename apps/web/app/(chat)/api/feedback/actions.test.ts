import { beforeEach, describe, expect, it, vi } from "vitest";

class MockApiClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

const apiFetch = vi.fn();
const getCurrentUser = vi.fn();
const revalidateTag = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

vi.mock("@/lib/auth-errors", () => ({
  getActionErrorMessage: vi.fn(
    (error: unknown, fallback: string) =>
      error instanceof Error && error.message ? error.message : fallback,
  ),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser,
}));

vi.mock("next/cache", () => ({
  revalidateTag,
}));

describe("feedback actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns normalized api errors", async () => {
    apiFetch.mockRejectedValueOnce(
      new MockApiClientError(403, "You do not have access to this resource."),
    );

    const { getAllFeedbackAction } = await import("./actions");
    const result = await getAllFeedbackAction();

    expect(result).toEqual({
      success: false,
      message: "You do not have access to this resource.",
    });
  });

  it("revalidates user feedback after successful submission", async () => {
    apiFetch.mockResolvedValueOnce({ id: "fb-1" });
    getCurrentUser.mockResolvedValueOnce({ id: "user-1" });

    const { submitFeedbackAction } = await import("./actions");
    const result = await submitFeedbackAction({
      type: "bug",
      title: "Broken flow",
      content: "Steps to reproduce",
    });

    expect(result).toEqual({
      success: true,
      message: "Feedback submitted successfully",
      data: { id: "fb-1" },
    });
    expect(revalidateTag).toHaveBeenNthCalledWith(1, "user-feedback", "max");
    expect(revalidateTag).toHaveBeenNthCalledWith(
      2,
      "user-feedback-user-1",
      "max",
    );
  });
});
