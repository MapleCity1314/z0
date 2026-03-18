import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api-errors";

const apiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

describe("profile actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes unauthenticated profile update failures", async () => {
    apiFetch.mockRejectedValueOnce(
      new ApiClientError({
        status: 401,
        message: "Unauthorized",
      }),
    );

    const formData = new FormData();
    formData.append("name", "Ada");

    const { updateProfile } = await import("./actions");
    const result = await updateProfile("user-1", formData);

    expect(result).toEqual({
      success: false,
      message: "Authentication required",
    });
  });

  it("falls back when profile update throws a non-error value", async () => {
    apiFetch.mockRejectedValueOnce(null);

    const formData = new FormData();
    formData.append("name", "Ada");

    const { updateProfile } = await import("./actions");
    const result = await updateProfile("user-1", formData);

    expect(result).toEqual({
      success: false,
      message: "Failed to update profile",
    });
  });
});
