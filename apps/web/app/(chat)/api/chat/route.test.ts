import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const parseChatRequestBody = vi.hoisted(() => vi.fn());
const validateChatRequest = vi.hoisted(() => vi.fn());
const mapAgentChatError = vi.hoisted(() =>
  vi.fn(() => ({
    status: 500,
    body: {
      code: "bad_request:api",
      message: "Failed to process chat request",
    },
  })),
);
const createInternalAuthHeaders = vi.hoisted(() =>
  vi.fn(() => ({
    "x-internal-auth-purpose": "web-api",
  })),
);
const withTimeout = vi.hoisted(() => vi.fn(async (promise: Promise<unknown>) => promise));
const getChatById = vi.hoisted(() => vi.fn(async () => ({ success: true, data: { id: "chat-1" } })));
const getRelevantMemories = vi.hoisted(() => vi.fn(async () => []));
const formatMemoriesForContext = vi.hoisted(() => vi.fn(() => "memory context"));
const processAllMessageFiles = vi.hoisted(() => vi.fn(async (messages) => messages));
const runDeferredPersistence = vi.hoisted(() => vi.fn(async () => undefined));
const getCurrentUser = vi.hoisted(() => vi.fn(async () => ({ id: "user-1", role: "user" })));

vi.mock("@z0/backend", () => ({
  createInternalAuthHeaders,
  mapAgentChatError,
  parseChatRequestBody,
  validateChatRequest,
  withTimeout,
}));

vi.mock("@/components/chat/actions", () => ({
  getChatById,
}));

vi.mock("@/lib/agent/memory/service", () => ({
  formatMemoriesForContext,
  getRelevantMemories,
}));

vi.mock("@/lib/agent/chat/attachments", () => ({
  processAllMessageFiles,
}));

vi.mock("@/lib/agent/chat/persistence", () => ({
  runDeferredPersistence,
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser,
}));

describe("chat route", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_BASE_URL = "http://localhost:3001";
    parseChatRequestBody.mockReturnValue({
      id: "chat-1",
      messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] }],
      model: "z0-mini",
      isReasoning: false,
      webSearchEnabled: false,
      projectId: null,
    });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns unauthorized before forwarding when the user is missing", async () => {
    getCurrentUser.mockResolvedValueOnce(null as never);

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "unauthorized:chat",
      message: "Unauthorized",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("forwards structured API errors with the upstream status", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          code: "forbidden:chat",
          message: "Forbidden",
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      ),
    ) as typeof fetch;

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "forbidden:chat",
      message: "Forbidden",
    });
  });

  it("normalizes upstream non-json errors instead of crashing locally", async () => {
    global.fetch = vi.fn(async () =>
      new Response("gateway offline", {
        status: 502,
        statusText: "Bad Gateway",
        headers: { "content-type": "text/plain" },
      }),
    ) as typeof fetch;

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: "bad_request:api",
      message: "Failed to process chat request",
      cause: "Agent API returned 502 Bad Gateway",
    });
    expect(mapAgentChatError).not.toHaveBeenCalled();
  });
});
