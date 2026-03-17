import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const buildAgentTools = vi.hoisted(() => vi.fn());

vi.mock("@/lib/agent/chat/tools", () => ({
  buildAgentTools,
}));

describe("agent tool bridge route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AGENT_BRIDGE_TOKEN = "bridge-token";
  });

  it("rejects requests without the bridge token", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/agent/tools/demo", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ toolName: "demo" }),
    });

    expect(response.status).toBe(403);
  });

  it("executes the requested tool through the registry", async () => {
    buildAgentTools.mockReturnValue({
      demoTool: {
        execute: vi.fn(async (input: unknown, context: unknown) => ({
          input,
          context,
        })),
      },
    });

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/agent/tools/demoTool", {
      method: "POST",
      body: JSON.stringify({
        chatId: "chat-1",
        projectId: "project-1",
        toolCallId: "tool-1",
        input: { foo: "bar" },
      }),
      headers: {
        "content-type": "application/json",
        "x-agent-bridge-token": "bridge-token",
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ toolName: "demoTool" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(buildAgentTools).toHaveBeenCalledWith(true, "project-1");
    expect(payload.data).toMatchObject({
      input: { foo: "bar" },
      context: {
        toolCallId: "tool-1",
        messages: {
          chatId: "chat-1",
          projectId: "project-1",
        },
      },
    });
  });
});
