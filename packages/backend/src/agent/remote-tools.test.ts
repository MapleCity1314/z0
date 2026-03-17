import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRemoteAgentTools } from "./remote-tools";

describe("createRemoteAgentTools", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.AGENT_BRIDGE_TOKEN = "bridge-token";
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ data: { success: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    delete process.env.AGENT_BRIDGE_TOKEN;
  });

  it("filters web and project tools by request context", () => {
    const tools = createRemoteAgentTools({
      actor: { userId: "user-1", role: "user" },
      webSearchEnabled: false,
      projectId: null,
      chatId: "chat-1",
    });

    expect(tools.createArtifact).toBeDefined();
    expect(tools.tavilySearch).toBeUndefined();
    expect(tools.readProjectFiles).toBeUndefined();
  });

  it("executes tools through the web bridge", async () => {
    const tools = createRemoteAgentTools({
      actor: { userId: "user-1", role: "admin" },
      webSearchEnabled: true,
      projectId: "project-1",
      chatId: "chat-1",
    });

    const result = await tools.createArtifact.execute?.(
      { title: "Demo" },
      {
        toolCallId: "tool-1",
        messages: [{ id: "m1", role: "user", parts: [] }],
      } as never,
    );

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/agent/tools/createArtifact",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-agent-bridge-token": "bridge-token",
          "x-user-id": "user-1",
          "x-user-role": "admin",
        }),
      }),
    );

    const requestInit = vi.mocked(global.fetch).mock.calls[0]?.[1];
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      chatId: "chat-1",
      projectId: "project-1",
      toolCallId: "tool-1",
      input: { title: "Demo" },
    });
  });
});
