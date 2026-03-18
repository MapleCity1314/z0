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

  it("throws the plain-text response message when the api does not return json", async () => {
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

    await expect(apiFetch("/v1/projects")).rejects.toThrow("Unauthorized");
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

  it("throws the API error message from json payloads", async () => {
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

    await expect(apiFetch("/v1/projects/prj-1")).rejects.toThrow(
      "Project access denied",
    );
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
