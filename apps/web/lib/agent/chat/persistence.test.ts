import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  generateTitleFromUserMessage: vi.fn(),
  getMessagesByChatId: vi.fn(),
  saveAgentRun: vi.fn(),
  saveChat: vi.fn(),
  saveMessages: vi.fn(),
  saveToolCalls: vi.fn(),
}));

const memory = vi.hoisted(() => ({
  extractMemoriesFromMessage: vi.fn(),
}));

vi.mock("@/lib/chat", () => actions);
vi.mock("@/lib/agent/memory/service", () => memory);

describe("agent chat persistence helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds persistable user messages with file attachments", async () => {
    const { buildPersistableUserMessages } = await import(
      "@/lib/agent/chat/persistence"
    );

    const messages = buildPersistableUserMessages(
      "chat-1",
      [
        {
          id: "m1",
          role: "user",
          parts: [
            { type: "text", text: "hello" },
            {
              type: "file",
              url: "https://example.com/file.txt",
              mediaType: "text/plain",
              filename: "file.txt",
            },
          ],
        },
      ],
      new Set(),
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].attachments).toEqual([
      {
        url: "https://example.com/file.txt",
        mediaType: "text/plain",
        filename: "file.txt",
      },
    ]);
  });

  it("persists new chats and extracts memories", async () => {
    actions.generateTitleFromUserMessage.mockResolvedValue({
      success: true,
      data: "New title",
    });
    actions.saveChat.mockResolvedValue({ success: true });
    actions.getMessagesByChatId.mockResolvedValue({ success: true, data: [] });
    actions.saveMessages.mockResolvedValue({ success: true });

    const { runDeferredPersistence } = await import(
      "@/lib/agent/chat/persistence"
    );

    await runDeferredPersistence({
      chatId: "chat-1",
      userId: "user-1",
      messages: [
        {
          id: "m1",
          role: "user",
          parts: [{ type: "text", text: "remember this" }],
        },
      ],
      projectId: null,
      isNewChat: true,
      userQuery: "remember this",
    });

    expect(actions.saveChat).toHaveBeenCalledWith({
      id: "chat-1",
      title: "New title",
      userId: "user-1",
      projectId: undefined,
    });
    expect(actions.saveMessages).toHaveBeenCalled();
    expect(memory.extractMemoriesFromMessage).toHaveBeenCalledWith(
      "user-1",
      "remember this",
    );
  });

  it("builds structured agent run and tool call records", async () => {
    const { buildAgentRunRecord, buildToolCallRecords } = await import(
      "@/lib/agent/chat/persistence"
    );

    const startedAt = new Date("2026-03-17T10:00:00.000Z");
    const finishedAt = new Date("2026-03-17T10:00:02.000Z");

    expect(
      buildAgentRunRecord({
        runId: "run-1",
        chatId: "chat-1",
        userId: "user-1",
        projectId: "project-1",
        parentRunId: "run-root",
        rootRunId: "run-root",
        triggerMessageId: "message-1",
        model: "z0-pro",
        agentKind: "subagent",
        agentName: "research-worker",
        isReasoning: true,
        webSearchEnabled: true,
        messageCount: 2,
        status: "completed",
        finishReason: "stop",
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        credits: 1,
        cost: 0.123456,
        startedAt,
        finishedAt,
        metadata: { toolCallCount: 1 },
      }),
    ).toMatchObject({
      id: "run-1",
      chatId: "chat-1",
      userId: "user-1",
      parentRunId: "run-root",
      rootRunId: "run-root",
      agentKind: "subagent",
      agentName: "research-worker",
      status: "completed",
      finishReason: "stop",
      cost: "0.123456",
      metadata: { toolCallCount: 1 },
    });

    const toolCalls = buildToolCallRecords({
      runId: "run-1",
      chatId: "chat-1",
      toolCalls: [
        {
          toolCallId: "tool-1",
          toolName: "createProject",
          input: { name: "demo" },
        },
      ],
      toolResults: [
        {
          toolCallId: "tool-1",
          toolName: "createProject",
          result: { success: true, projectId: "project-1" },
        },
      ],
      startedAt,
      finishedAt,
    });

    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0]).toMatchObject({
      runId: "run-1",
      chatId: "chat-1",
      toolCallId: "tool-1",
      toolName: "createProject",
      state: "output-available",
      input: { name: "demo" },
      output: { success: true, projectId: "project-1" },
    });
  });

  it("persists agent telemetry through action boundaries", async () => {
    actions.saveAgentRun.mockResolvedValue({
      success: true,
      message: "ok",
    });
    actions.saveToolCalls.mockResolvedValue({
      success: true,
      message: "ok",
    });

    const { persistAgentTelemetry } = await import(
      "@/lib/agent/chat/persistence"
    );

    await persistAgentTelemetry({
      telemetry: {
        runId: "run-1",
        chatId: "chat-1",
        userId: "user-1",
        projectId: null,
        parentRunId: "run-parent",
        rootRunId: "run-root",
        model: "z0-mini",
        agentKind: "subagent",
        agentName: "planner",
        isReasoning: false,
        webSearchEnabled: false,
        messageCount: 1,
        status: "completed",
        finishReason: "stop",
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
        credits: 1,
        cost: 0.001,
        startedAt: new Date("2026-03-17T10:00:00.000Z"),
        finishedAt: new Date("2026-03-17T10:00:01.000Z"),
      },
      toolCalls: [],
      toolResults: [],
    });

    expect(actions.saveAgentRun).toHaveBeenCalledOnce();
    expect(actions.saveToolCalls).toHaveBeenCalledWith({ calls: [] });
  });
});
