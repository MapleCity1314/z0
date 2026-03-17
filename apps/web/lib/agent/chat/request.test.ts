import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import {
  addMessageMetadata,
  buildZ0MaxErrorHint,
  extractLatestUserQuery,
  getAnthropicReasoningOptions,
  parseRequestBody,
} from "@/lib/agent/chat/request";

describe("agent chat request helpers", () => {
  it("parses request body with backward-compatible thinking flag", () => {
    const payload = parseRequestBody({
      id: "chat-1",
      messages: [],
      model: "z0-pro",
      enableThinking: true,
      webSearchEnabled: true,
      projectId: "project-1",
    });

    expect(payload).toEqual({
      id: "chat-1",
      messages: [],
      model: "z0-pro",
      isReasoning: true,
      webSearchEnabled: true,
      projectId: "project-1",
    });
  });

  it("extracts the latest user text and annotates metadata", () => {
    const messages: UIMessage[] = [
      {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "first" }],
      },
      {
        id: "m2",
        role: "assistant",
        parts: [{ type: "text", text: "reply" }],
      },
      {
        id: "m3",
        role: "user",
        parts: [
          { type: "text", text: "latest" },
          { type: "text", text: "question" },
        ],
      },
    ];

    expect(extractLatestUserQuery(messages)).toBe("latest question");

    const annotated = addMessageMetadata(
      messages,
      "chat-1",
      "project-1",
      "user-1",
    );
    expect(annotated[0].metadata).toMatchObject({
      chatId: "chat-1",
      projectId: "project-1",
      userId: "user-1",
    });
  });

  it("enables anthropic reasoning only for supported models", () => {
    expect(getAnthropicReasoningOptions("z0-pro", true)).toEqual({
      anthropic: {
        thinking: { type: "enabled", budgetTokens: 12000 },
      },
    });
    expect(getAnthropicReasoningOptions("z0-mini", true)).toBeUndefined();
    expect(buildZ0MaxErrorHint("service unavailable")).toContain(
      "z0-max config hint",
    );
  });
});
