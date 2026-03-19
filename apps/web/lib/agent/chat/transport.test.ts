import { beforeEach, describe, expect, it, vi } from "vitest";

const createInternalAuthHeaders = vi.hoisted(() =>
  vi.fn(
    ({
      actor,
      purpose,
    }: {
      actor: { userId: string; role: string };
      purpose: string;
    }) => ({
      "x-internal-actor-id": actor.userId,
      "x-internal-actor-role": actor.role,
      "x-internal-auth-purpose": purpose,
    }),
  ),
);
const extractLatestUserQuery = vi.hoisted(() => vi.fn(() => "latest question"));
const withTimeout = vi.hoisted(() =>
  vi.fn(async (promise: Promise<unknown>) => promise),
);

vi.mock("@z0/backend/agent/request", () => ({
  extractLatestUserQuery,
  withTimeout,
}));

vi.mock("@z0/backend/auth", () => ({
  createInternalAuthHeaders,
}));

describe("agent chat transport helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_BASE_URL = "http://localhost:3001";
  });

  it("prepares the forwarded api payload and deferred persistence input", async () => {
    const { prepareChatForwardRequest } = await import("./transport");

    const processedMessages = [
      {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "processed" }],
      },
    ];

    const prepared = await prepareChatForwardRequest({
      payload: {
        id: "chat-1",
        messages: [
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: "raw" }],
          },
        ] as never,
        model: "z0-mini",
        isReasoning: false,
        webSearchEnabled: true,
        projectId: "project-1",
      },
      user: { id: "user-1", role: "admin" },
      cookieHeader: "session=abc",
      processMessages: vi.fn(async () => processedMessages as never),
      getChatById: vi.fn(async () => ({ success: true, data: { id: "chat-1" } })),
      getRelevantMemories: vi.fn(async () => [
        {
          id: "memory-1",
          memory: "stored memory",
          createdAt: new Date("2026-03-19T00:00:00.000Z"),
        },
      ]),
      formatMemoriesForContext: vi.fn(() => "memory context"),
    });

    expect(prepared.apiUrl).toBe("http://localhost:3001/v1/agent/chat");
    expect(prepared.apiHeaders).toMatchObject({
      "content-type": "application/json",
      cookie: "session=abc",
      "x-internal-actor-id": "user-1",
      "x-internal-actor-role": "admin",
      "x-internal-auth-purpose": "web-api",
    });
    expect(prepared.apiBody).toMatchObject({
      id: "chat-1",
      messages: processedMessages,
      memoryContext: "memory context",
      webSearchEnabled: true,
      projectId: "project-1",
    });
    expect(prepared.persistence).toEqual({
      chatId: "chat-1",
      userId: "user-1",
      messages: processedMessages,
      projectId: "project-1",
      isNewChat: false,
      userQuery: "latest question",
    });
  });

  it("falls back to an empty memory context when the lookup fails", async () => {
    const { prepareChatForwardRequest } = await import("./transport");

    const prepared = await prepareChatForwardRequest({
      payload: {
        id: "chat-1",
        messages: [] as never,
        model: "z0-mini",
        isReasoning: false,
        webSearchEnabled: false,
        projectId: null,
      },
      user: { id: "user-1", role: "user" },
      cookieHeader: null,
      processMessages: vi.fn(async () => [] as never),
      getChatById: vi.fn(async () => ({ success: false })),
      getRelevantMemories: vi.fn(async () => {
        throw new Error("memory offline");
      }),
      formatMemoriesForContext: vi.fn(() => "unused"),
    });

    expect(prepared.apiBody.memoryContext).toBe("");
    expect(prepared.persistence.isNewChat).toBe(true);
  });

  it("normalizes malformed upstream chat api errors", async () => {
    const { readForwardedChatError } = await import("./transport");

    const response = new Response(JSON.stringify({ detail: "missing fields" }), {
      status: 502,
      statusText: "Bad Gateway",
      headers: { "content-type": "application/json" },
    });

    await expect(readForwardedChatError(response)).resolves.toEqual({
      code: "bad_request:api",
      message: "Failed to process chat request",
      cause: "Agent API returned 502 Bad Gateway",
    });
  });
});
