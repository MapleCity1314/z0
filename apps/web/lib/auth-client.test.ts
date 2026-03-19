import { describe, expect, it } from "vitest";
import { getAuthClientBaseURL } from "./auth-client";

describe("getAuthClientBaseURL", () => {
  it("builds an absolute auth endpoint from the app origin", () => {
    expect(getAuthClientBaseURL("https://z0.dev")).toBe(
      "https://z0.dev/api/auth",
    );
  });

  it("normalizes trailing slashes", () => {
    expect(getAuthClientBaseURL("http://localhost:3000/")).toBe(
      "http://localhost:3000/api/auth",
    );
  });

  it("prefers the current runtime origin when available", () => {
    expect(
      getAuthClientBaseURL("http://localhost:3000", "https://preview.z0.dev"),
    ).toBe("https://preview.z0.dev/api/auth");
  });
});
