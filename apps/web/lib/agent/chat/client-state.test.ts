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
});
