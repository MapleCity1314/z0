import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiClientError } from "./api-errors";
import { getServerActionErrorMessage } from "./server-action-errors";

describe("getServerActionErrorMessage", () => {
  it("returns the configured invalid input message for zod errors", () => {
    expect(
      getServerActionErrorMessage(new z.ZodError([]), {
        fallback: "Failed to save project.",
        invalidInputMessage: "Invalid project input",
      }),
    ).toBe("Invalid project input");
  });

  it("returns normalized api client messages for api errors", () => {
    expect(
      getServerActionErrorMessage(
        new ApiClientError({
          status: 403,
          message: "You do not have access to this resource.",
        }),
        { fallback: "Failed to save project." },
      ),
    ).toBe("You do not have access to this resource.");
  });

  it("falls back for unknown thrown values", () => {
    expect(
      getServerActionErrorMessage(null, {
        fallback: "Failed to update profile",
      }),
    ).toBe("Failed to update profile");
  });
});
