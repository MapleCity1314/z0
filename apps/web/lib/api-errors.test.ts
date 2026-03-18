import { describe, expect, it } from "vitest";
import {
  ApiClientError,
  getApiErrorMessage,
  normalizeAuthErrorMessage,
} from "./api-errors";

describe("api error helpers", () => {
  it("normalizes legacy auth strings to a shared message", () => {
    expect(normalizeAuthErrorMessage("Unauthorized")).toBe(
      "Authentication required",
    );
    expect(normalizeAuthErrorMessage("User not authenticated")).toBe(
      "Authentication required",
    );
  });

  it("preserves api client error messages", () => {
    expect(
      getApiErrorMessage(
        new ApiClientError({
          status: 403,
          message: "You do not have access to this resource.",
        }),
        "Fallback",
      ),
    ).toBe("You do not have access to this resource.");
  });

  it("normalizes generic auth errors before returning them", () => {
    expect(getApiErrorMessage(new Error("Unauthorized"), "Fallback")).toBe(
      "Authentication required",
    );
  });

  it("uses the provided fallback when no message is available", () => {
    expect(getApiErrorMessage({ cause: "unknown" }, "Fallback")).toBe(
      "Fallback",
    );
  });
});
