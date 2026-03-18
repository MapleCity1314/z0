import { describe, expect, it } from "vitest";
import { ApiClientError } from "./api-errors";
import {
  AUTHENTICATION_REQUIRED_MESSAGE,
  getActionErrorMessage,
  isUnauthenticatedMessage,
  shouldShowErrorToast,
} from "./auth-errors";

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
          message: AUTHENTICATION_REQUIRED_MESSAGE,
        }),
      ),
    ).toBe(true);
  });

  it("matches auth Error instances", () => {
    expect(isUnauthenticatedMessage(new Error("User not authenticated"))).toBe(
      true,
    );
    expect(isUnauthenticatedMessage(new Error("Not authenticated"))).toBe(
      true,
    );
  });

  it("normalizes unauthenticated action errors", () => {
    expect(
      getActionErrorMessage(
        new Error("User not authenticated"),
        "Failed to load settings",
      ),
    ).toBe(AUTHENTICATION_REQUIRED_MESSAGE);
  });

  it("falls back for unknown non-error action failures", () => {
    expect(getActionErrorMessage(null, "Failed to load settings")).toBe(
      "Failed to load settings",
    );
  });

  it("suppresses toasts for unauthenticated messages", () => {
    expect(shouldShowErrorToast("User not authenticated")).toBe(false);
    expect(shouldShowErrorToast(AUTHENTICATION_REQUIRED_MESSAGE)).toBe(false);
    expect(shouldShowErrorToast("Failed to load project")).toBe(true);
  });
});
