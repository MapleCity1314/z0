import { beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn(async () => new Headers()));
const verifyInternalAuthHeadersMock = vi.hoisted(() => vi.fn());
const resolveSessionActorMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@z0/backend/auth", () => ({
  verifyInternalAuthHeaders: verifyInternalAuthHeadersMock,
  resolveSessionActor: resolveSessionActorMock,
}));

vi.mock("./auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

describe("session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    verifyInternalAuthHeadersMock.mockReturnValue(null);
    resolveSessionActorMock.mockResolvedValue(null);
    getSessionMock.mockResolvedValue(null);
  });

  it("prefers internal auth headers when present", async () => {
    verifyInternalAuthHeadersMock.mockImplementation(
      (_headers: Headers, purpose: string) =>
        purpose === "web-api"
          ? { userId: "user-internal", role: "admin" }
          : null,
    );

    const { getCurrentUser } = await import("./session");
    const user = await getCurrentUser();

    expect(user).toEqual({
      id: "user-internal",
      name: "",
      email: "",
      avatar: null,
      role: "admin",
    });
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(resolveSessionActorMock).not.toHaveBeenCalled();
  });

  it("returns the Better Auth session when available", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "user-session",
        name: "Ada",
        email: "ada@example.com",
        image: "https://example.com/avatar.png",
        role: "user",
      },
    });

    const { getCurrentUser } = await import("./session");
    const user = await getCurrentUser();

    expect(user).toEqual({
      id: "user-session",
      name: "Ada",
      email: "ada@example.com",
      avatar: "https://example.com/avatar.png",
      role: "user",
    });
    expect(resolveSessionActorMock).not.toHaveBeenCalled();
  });

  it("falls back to resolving the session actor from cookies", async () => {
    resolveSessionActorMock.mockResolvedValue({
      userId: "user-cookie",
      role: "user",
    });

    const { getCurrentUser } = await import("./session");
    const user = await getCurrentUser();

    expect(user).toEqual({
      id: "user-cookie",
      name: "",
      email: "",
      avatar: null,
      role: "user",
    });
  });

  it("returns null when no auth context is available", async () => {
    const { getCurrentUser } = await import("./session");

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
