import { describe, expect, it } from "vitest";
import {
  addMessageMetadata,
  buildZ0MaxErrorHint,
  extractLatestAgentRunContext,
  extractLatestUserQuery,
  getAnthropicReasoningOptions,
  isFilePart,
  parseChatRequestBody,
  validateChatRequest,
} from "./request";

describe("agent request helpers", () => {
  it("parses request payload defaults", () => {
    const payload = parseChatRequestBody({
      id: "chat-1",
      messages: [],
      model: "z0-mini",
    });

    expect(payload.webSearchEnabled).toBe(false);
    expect(payload.isReasoning).toBe(false);
    expect(payload.projectId).toBeNull();
  });

  it("validates known models", () => {
    expect(() =>
      validateChatRequest({
        id: "chat-1",
        messages: [],
        model: "z0-mini",
        isReasoning: false,
        webSearchEnabled: false,
        projectId: null,
      }),
    ).not.toThrow();
  });

  it("extracts latest user query and run context", () => {
    const messages = [
      {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "hello world" }],
        metadata: {
          agentContext: {
            parentRunId: "parent-1",
            rootRunId: "root-1",
            agentKind: "sub-agent",
            agentName: "planner",
          },
        },
      },
    ] as any;

    expect(extractLatestUserQuery(messages)).toBe("hello world");
    expect(extractLatestAgentRunContext(messages)).toEqual({
      parentRunId: "parent-1",
      rootRunId: "root-1",
      agentKind: "sub-agent",
      agentName: "planner",
      metadata: undefined,
    });
  });

  it("adds message metadata and detects file parts", () => {
    const [message] = addMessageMetadata(
      [{ id: "m1", role: "user", parts: [] } as any],
      "chat-1",
      "project-1",
      "user-1",
    );

    expect(message.metadata).toMatchObject({
      chatId: "chat-1",
      projectId: "project-1",
      userId: "user-1",
    });
    expect(
      isFilePart({ type: "file", url: "/a.txt", mediaType: "text/plain" }),
    ).toBe(true);
  });

  it("builds reasoning options and z0-max hint", () => {
    expect(getAnthropicReasoningOptions("z0-pro", true)).toBeUndefined();
    expect(buildZ0MaxErrorHint("503")).toContain("z0-max config hint");
  });
});
