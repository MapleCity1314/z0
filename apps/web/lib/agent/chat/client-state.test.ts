import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  generateUUID: vi.fn(() => "generated-id"),
}));

describe("agent chat client state helpers", () => {
  it("builds an outgoing user message from text and files", async () => {
    const { buildOutgoingUserMessage } = await import(
      "@/lib/agent/chat/client-state"
    );

    expect(
      buildOutgoingUserMessage({
        text: "Ship this",
        files: [
          {
            type: "file",
            mediaType: "text/plain",
            filename: "notes.txt",
            url: "https://example.com/notes.txt",
          },
        ],
      }),
    ).toEqual({
      id: "generated-id",
      role: "user",
      parts: [
        { type: "text", text: "Ship this" },
        {
          type: "file",
          mediaType: "text/plain",
          filename: "notes.txt",
          url: "https://example.com/notes.txt",
        },
      ],
    });
  });

  it("detects project creation and file updates from completed tool output", async () => {
    const { getChatToolEffects } = await import(
      "@/lib/agent/chat/client-state"
    );

    const result = getChatToolEffects(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "tool-createProject",
              toolCallId: "tool-1",
              state: "output-available",
              input: {},
              output: { success: true, projectId: "project-1" },
            },
            {
              type: "tool-updateProjectFile",
              toolCallId: "tool-2",
              state: "output-available",
              input: {},
              output: { success: true },
            },
          ],
        },
      ],
      new Set<string>(),
    );

    expect(result.projectIdToOpen).toBe("project-1");
    expect(result.shouldTriggerFileUpdate).toBe(true);
    expect([...result.nextHandledToolCallIds]).toEqual(["tool-1", "tool-2"]);
  });

  it("reports project generation while project tools are still streaming", async () => {
    const { isProjectGenerationActive } = await import(
      "@/lib/agent/chat/client-state"
    );

    expect(
      isProjectGenerationActive(
        [
          {
            id: "assistant-1",
            role: "assistant",
            parts: [
              {
                type: "tool-runBuild",
                toolCallId: "tool-1",
                state: "input-streaming",
                input: {},
              },
            ],
          },
        ],
        "project-1",
      ),
    ).toBe(true);

    expect(
      isProjectGenerationActive(
        [
          {
            id: "assistant-2",
            role: "assistant",
            parts: [
              {
                type: "tool-runBuild",
                toolCallId: "tool-1",
                state: "output-available",
                input: {},
                output: { success: true },
              },
            ],
          },
        ],
        "project-1",
      ),
    ).toBe(false);
  });

  it("appends an assistant error part to the last assistant message", async () => {
    const {
      buildAssistantErrorPart,
      upsertAssistantErrorMessage,
    } = await import("@/lib/agent/chat/client-state");

    const errorPart = buildAssistantErrorPart({
      message: "Something went wrong. Please try again later.",
      cause: "Agent API returned 500",
      timestamp: "2026-03-21T12:00:00.000Z",
    });

    const result = upsertAssistantErrorMessage({
      messages: [
        {
          id: "user-1",
          role: "user",
          parts: [{ type: "text", text: "hello" }],
        },
        {
          id: "assistant-1",
          role: "assistant",
          parts: [{ type: "text", text: "working on it" }],
        },
      ],
      errorPart,
    });

    expect(result.errorMessage).toEqual({
      id: "assistant-1",
      role: "assistant",
      parts: [
        { type: "text", text: "working on it" },
        {
          type: "data-error",
          data: {
            title: "Error",
            message: "Something went wrong. Please try again later.",
            cause: "Agent API returned 500",
            timestamp: "2026-03-21T12:00:00.000Z",
          },
        },
      ],
    });
  });

  it("creates a new assistant error placeholder when no assistant message exists", async () => {
    const {
      buildAssistantErrorPart,
      upsertAssistantErrorMessage,
    } = await import("@/lib/agent/chat/client-state");

    const errorPart = buildAssistantErrorPart({
      message: "Unknown error occurred",
      timestamp: "2026-03-21T12:00:00.000Z",
    });

    const result = upsertAssistantErrorMessage({
      messages: [
        {
          id: "user-1",
          role: "user",
          parts: [{ type: "text", text: "hello" }],
        },
      ],
      errorPart,
    });

    expect(result.messages).toEqual([
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      },
      {
        id: "generated-id",
        role: "assistant",
        parts: [
          {
            type: "data-error",
            data: {
              title: "Error",
              message: "Unknown error occurred",
              timestamp: "2026-03-21T12:00:00.000Z",
            },
          },
        ],
      },
    ]);
  });
});
