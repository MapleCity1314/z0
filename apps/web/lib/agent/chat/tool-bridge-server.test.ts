import { describe, expect, it, vi } from "vitest";

const createToolBridgeErrorResponse = vi.hoisted(() =>
  vi.fn(
    ({
      code,
      message,
      status,
      toolName,
    }: {
      code: string;
      message: string;
      status: number;
      toolName?: string;
    }) => ({
      error: {
        code,
        message,
        status,
        toolName,
      },
    }),
  ),
);

vi.mock("@z0/backend", () => ({
  createToolBridgeErrorResponse,
}));

describe("tool bridge server helpers", () => {
  it("rejects chats the actor does not own", async () => {
    const { authorizeToolBridgeTargets } = await import("./tool-bridge-server");

    await expect(
      authorizeToolBridgeTargets({
        actorUserId: "user-1",
        body: {
          chatId: "chat-1",
          projectId: null,
          webSearchEnabled: false,
          toolCallId: undefined,
          input: {},
          context: undefined,
        },
        toolName: "demoTool",
        hasOwnedChat: vi.fn(async () => false),
        hasOwnedProject: vi.fn(async () => true),
      }),
    ).resolves.toEqual({
      error: {
        code: "forbidden:tool_bridge",
        message: "Chat not found or access denied",
        status: 403,
        toolName: "demoTool",
      },
    });
  });

  it("resolves existing tools and returns a structured not-found error otherwise", async () => {
    const { resolveAgentToolForBridge } = await import("./tool-bridge-server");

    const targetTool = { execute: vi.fn(async () => ({ ok: true })) };
    expect(
      resolveAgentToolForBridge({
        toolName: "demoTool",
        webSearchEnabled: true,
        projectId: "project-1",
        buildTools: vi.fn(() => ({
          demoTool: targetTool,
        })),
      }),
    ).toEqual({
      targetTool,
      error: null,
    });

    expect(
      resolveAgentToolForBridge({
        toolName: "missingTool",
        webSearchEnabled: false,
        projectId: null,
        buildTools: vi.fn(() => ({})),
      }),
    ).toEqual({
      targetTool: null,
      error: {
        error: {
          code: "not_found:tool_bridge",
          message: "Unknown agent tool: missingTool",
          status: 404,
          toolName: "missingTool",
        },
      },
    });
  });
});
