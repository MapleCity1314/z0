import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRemoteAgentTools,
  RemoteToolExecutionError,
} from "./remote-tools";
import { verifyInternalAuthHeaders } from "../auth/internal";

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
          "x-internal-actor-id": "user-1",
          "x-internal-actor-role": "admin",
          "x-internal-auth-purpose": "agent-bridge",
        }),
      }),
    );

    const requestInit = vi.mocked(global.fetch).mock.calls[0]?.[1];
    const signedHeaders = new Headers(
      requestInit?.headers as Record<string, string>,
    );
    expect(verifyInternalAuthHeaders(signedHeaders, "agent-bridge")).toEqual({
      userId: "user-1",
      role: "admin",
    });
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      chatId: "chat-1",
      projectId: "project-1",
      webSearchEnabled: true,
      toolCallId: "tool-1",
      input: { title: "Demo" },
    });
  });

  it("throws a typed error when the bridge returns a structured failure", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "not_found:tool_bridge",
            message: "Unknown agent tool: createArtifact",
            status: 404,
            toolName: "createArtifact",
          },
        }),
        {
          status: 404,
          headers: { "content-type": "application/json" },
        },
      ),
    ) as typeof fetch;

    const tools = createRemoteAgentTools({
      actor: { userId: "user-1", role: "user" },
      webSearchEnabled: false,
      projectId: null,
      chatId: "chat-1",
    });

    await expect(
      tools.createArtifact.execute?.({}, {
        toolCallId: "tool-1",
        messages: [],
      } as never),
    ).rejects.toMatchObject({
      code: "not_found:tool_bridge",
      status: 404,
      toolName: "createArtifact",
      message: "Unknown agent tool: createArtifact",
      retryable: false,
    });
  });

  it("treats invalid bridge responses as retryable runtime errors", async () => {
    global.fetch = vi.fn(async () =>
      new Response("not-json", {
        status: 502,
        headers: { "content-type": "text/plain" },
      }),
    ) as typeof fetch;

    const tools = createRemoteAgentTools({
      actor: { userId: "user-1", role: "user" },
      webSearchEnabled: false,
      projectId: null,
      chatId: "chat-1",
    });

    await expect(
      tools.createArtifact.execute?.({}, {
        toolCallId: "tool-1",
        messages: [],
      } as never),
    ).rejects.toMatchObject({
      code: "invalid_response:tool_bridge",
      status: 502,
      toolName: "createArtifact",
      retryable: true,
    });
  });

  it("treats malformed json bridge payloads as retryable runtime errors", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            unexpected: true,
          },
        }),
        {
          status: 502,
          headers: { "content-type": "application/json" },
        },
      ),
    ) as typeof fetch;

    const tools = createRemoteAgentTools({
      actor: { userId: "user-1", role: "user" },
      webSearchEnabled: false,
      projectId: null,
      chatId: "chat-1",
    });

    await expect(
      tools.createArtifact.execute?.({}, {
        toolCallId: "tool-1",
        messages: [],
      } as never),
    ).rejects.toMatchObject({
      code: "invalid_response:tool_bridge",
      status: 502,
      toolName: "createArtifact",
      retryable: true,
    });
  });

  it("maps bridge network failures to retryable typed errors", async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;

    const tools = createRemoteAgentTools({
      actor: { userId: "user-1", role: "user" },
      webSearchEnabled: false,
      projectId: null,
      chatId: "chat-1",
    });

    await expect(
      tools.createArtifact.execute?.({}, {
        toolCallId: "tool-1",
        messages: [],
      } as never),
    ).rejects.toBeInstanceOf(RemoteToolExecutionError);

    await expect(
      tools.createArtifact.execute?.({}, {
        toolCallId: "tool-1",
        messages: [],
      } as never),
    ).rejects.toMatchObject({
      code: "failed:tool_bridge",
      status: 502,
      toolName: "createArtifact",
      retryable: true,
      message: "createArtifact bridge request failed",
    });
  });
});
