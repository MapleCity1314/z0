import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAgentChatResponse,
  mapAgentChatError,
  type AgentChatDependencies,
} from "./chat";
import type { ChatRequestPayload } from "./request";

vi.mock("ai", () => ({
  convertToModelMessages: vi.fn(async (messages) => messages),
  stepCountIs: vi.fn(() => "stop"),
  streamText: vi.fn(() => ({
    toUIMessageStreamResponse: vi.fn(() => new Response("ok")),
  })),
}));

function makePayload(): ChatRequestPayload {
  return {
    id: "chat-1",
    messages: [
      { id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] },
    ] as any,
    model: "z0-mini",
    isReasoning: false,
    webSearchEnabled: false,
    projectId: null,
  };
}

function makeDependencies(): AgentChatDependencies {
  return {
    getCurrentUser: vi.fn(async () => ({ id: "user-1" })),
    getChatOwnerId: vi.fn(async () => null),
    processMessages: vi.fn(async (messages) => messages),
    buildMemoryContext: vi.fn(async () => ""),
    getAvailableSkills: vi.fn(async () => []),
    buildTools: vi.fn(() => ({})),
    getModel: vi.fn(() => ({}) as any),
    updateChatProjectLinkFromToolResults: vi.fn(async () => undefined),
    persistTelemetry: vi.fn(async () => undefined),
    runDeferredPersistence: vi.fn(async () => undefined),
    saveAssistantMessage: vi.fn(async () => undefined),
  };
}

describe("createAgentChatResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when current user is missing", async () => {
    const dependencies = makeDependencies();
    vi.mocked(dependencies.getCurrentUser).mockResolvedValueOnce(null);

    await expect(
      createAgentChatResponse({
        payload: makePayload(),
        dependencies,
      }),
    ).rejects.toMatchObject({ code: "unauthorized:chat", status: 401 });
  });

  it("creates a response and kicks off deferred persistence", async () => {
    const dependencies = makeDependencies();

    const response = await createAgentChatResponse({
      payload: makePayload(),
      dependencies,
    });

    expect(response).toBeInstanceOf(Response);
    expect(dependencies.runDeferredPersistence).toHaveBeenCalled();
    expect(dependencies.processMessages).toHaveBeenCalled();
    expect(dependencies.getAvailableSkills).toHaveBeenCalledWith({
      userId: "user-1",
      chatId: "chat-1",
    });
  });
});

describe("mapAgentChatError", () => {
  it("maps generic z0-max errors with config hint", () => {
    const mapped = mapAgentChatError(
      new Error("503 service unavailable"),
      "z0-max",
    );
    expect(mapped.status).toBe(500);
    expect(String(mapped.body.cause)).toContain("z0-max config hint");
  });
});
