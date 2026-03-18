import { afterEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
const createInternalAuthHeadersMock = vi.hoisted(() => vi.fn(() => ({})));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@z0/backend", () => ({
  createInternalAuthHeaders: createInternalAuthHeadersMock,
}));

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("normalizes plain-text 401 responses into an auth error", async () => {
    headersMock.mockResolvedValue({
      get: vi.fn(() => null),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("Unauthorized", {
          status: 401,
          headers: {
            "content-type": "text/plain; charset=utf-8",
          },
        }),
      ),
    );

    const { apiFetch } = await import("./api");

    await expect(apiFetch("/v1/projects")).rejects.toMatchObject({
      name: "ApiClientError",
      status: 401,
      message: "Authentication required",
    });
  });

  it("returns typed data for successful json responses", async () => {
    headersMock.mockResolvedValue({
      get: vi.fn(() => null),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ data: { id: "prj-1" } }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );

    const { apiFetch } = await import("./api");

    await expect(apiFetch<{ id: string }>("/v1/projects")).resolves.toEqual({
      id: "prj-1",
    });
  });

  it("normalizes 403 responses into a safe access-denied message", async () => {
    headersMock.mockResolvedValue({
      get: vi.fn(() => "session=abc"),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "forbidden",
              message: "Project access denied",
            },
          }),
          {
            status: 403,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      ),
    );

    const { apiFetch } = await import("./api");

    await expect(apiFetch("/v1/projects/prj-1")).rejects.toMatchObject({
      name: "ApiClientError",
      status: 403,
      message: "You do not have access to this resource.",
    });
  });

  it("preserves validation messages for 422 responses", async () => {
    headersMock.mockResolvedValue({
      get: vi.fn(() => null),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "validation_error",
              message: "Version is required",
            },
          }),
          {
            status: 422,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      ),
    );

    const { apiFetch } = await import("./api");

    await expect(apiFetch("/v1/admin/versions")).rejects.toMatchObject({
      name: "ApiClientError",
      status: 422,
      code: "validation_error",
      message: "Version is required",
    });
  });

  it("hides raw 500 messages behind a generic fallback", async () => {
    headersMock.mockResolvedValue({
      get: vi.fn(() => null),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              message: "database connection exploded",
            },
          }),
          {
            status: 500,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      ),
    );

    const { apiFetch } = await import("./api");

    await expect(apiFetch("/v1/admin/dashboard")).rejects.toMatchObject({
      name: "ApiClientError",
      status: 500,
      message: "Something went wrong. Please try again later.",
    });
  });

  it("uses internal auth headers instead of cookies when an actor is provided", async () => {
    const cookieGet = vi.fn(() => "session=abc");
    headersMock.mockResolvedValue({
      get: cookieGet,
    });
    createInternalAuthHeadersMock.mockReturnValue({
      "x-user-id": "u1",
      "x-user-role": "user",
    });

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { apiFetch } = await import("./api");

    await expect(
      apiFetch<{ ok: true }>(
        "/v1/projects",
        undefined,
        { actor: { userId: "u1" } },
      ),
    ).resolves.toEqual({ ok: true });

    expect(createInternalAuthHeadersMock).toHaveBeenCalledWith({
      actor: {
        userId: "u1",
        role: "user",
      },
      purpose: "web-api",
    });
    expect(cookieGet).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/v1/projects",
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-user-id": "u1",
          "x-user-role": "user",
        }),
      }),
    );
  });
});
