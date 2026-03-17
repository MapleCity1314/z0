import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  generateTitleFromUserMessage: vi.fn(),
  getMessagesByChatId: vi.fn(),
  saveChat: vi.fn(),
  saveMessages: vi.fn(),
}));

const memory = vi.hoisted(() => ({
  extractMemoriesFromMessage: vi.fn(),
}));

vi.mock("@/components/chat/actions", () => actions);
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
});
