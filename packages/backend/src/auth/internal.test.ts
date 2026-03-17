import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInternalAuthHeaders,
  verifyInternalAuthHeaders,
} from "./internal";

describe("internal auth headers", () => {
  beforeEach(() => {
    process.env.AGENT_BRIDGE_TOKEN = "bridge-token";
    vi.useRealTimers();
  });

  it("signs and verifies actor headers for the expected purpose", () => {
    const headers = new Headers(
      createInternalAuthHeaders({
        actor: { userId: "user-1", role: "admin" },
        purpose: "agent-bridge",
        now: 1_700_000_000_000,
      }),
    );

    vi.setSystemTime(new Date(1_700_000_000_000));

    expect(verifyInternalAuthHeaders(headers, "agent-bridge")).toEqual({
      userId: "user-1",
      role: "admin",
    });
    expect(verifyInternalAuthHeaders(headers, "web-api")).toBeNull();
  });

  it("rejects expired signatures", () => {
    const headers = new Headers(
      createInternalAuthHeaders({
        actor: { userId: "user-1", role: "user" },
        purpose: "web-api",
        now: 1_700_000_000_000,
      }),
    );

    vi.setSystemTime(new Date(1_700_000_070_000));

    expect(verifyInternalAuthHeaders(headers, "web-api")).toBeNull();
  });
});
