import { describe, expect, it } from "vitest";
import { ApiClientError } from "./api";
import { isUnauthenticatedMessage } from "./auth-errors";

describe("isUnauthenticatedMessage", () => {
  it("matches known unauthenticated messages", () => {
    expect(isUnauthenticatedMessage("Unauthorized")).toBe(true);
    expect(isUnauthenticatedMessage("User not authenticated")).toBe(true);
    expect(isUnauthenticatedMessage("authentication required")).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isUnauthenticatedMessage("Failed to load project")).toBe(false);
    expect(isUnauthenticatedMessage(undefined)).toBe(false);
  });

  it("matches 401 api client errors", () => {
    expect(
      isUnauthenticatedMessage(
        new ApiClientError({
          status: 401,
          message: "Authentication required",
        }),
      ),
    ).toBe(true);
  });
});
