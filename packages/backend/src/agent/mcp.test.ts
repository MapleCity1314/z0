import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createConfiguredMcpToolRuntime,
  getOrCreatePooledMcpToolRuntime,
  warmMcpServers,
  warmPooledMcpServers,
} from "./mcp";

vi.mock("@ai-sdk/mcp", () => ({
  createMCPClient: vi.fn(async () => ({
    tools: async () => ({
      echo: {
        description: "Echo text",
        inputSchema: { type: "object", properties: {} },
        execute: vi.fn(async (input: unknown) => input),
      },
    }),
    close: vi.fn(async () => undefined),
  })),
}));

describe("createConfiguredMcpToolRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefixes MCP tool names and preserves execution", async () => {
    const runtime = await createConfiguredMcpToolRuntime({
      servers: [
        {
          id: "server-1",
          name: "Browser Ops",
          endpoint: "https://example.com/mcp",
          sourceType: "external",
        },
      ],
      reservedToolNames: ["createArtifact"],
    });

    expect(Object.keys(runtime.tools)).toEqual(["mcp_browser_ops_echo"]);
    expect(runtime.mcpTools).toEqual([
      expect.objectContaining({
        name: "mcp_browser_ops_echo",
        originalName: "echo",
        serverName: "Browser Ops",
      }),
    ]);
    expect(runtime.serverStatuses).toEqual([
      expect.objectContaining({
        id: "server-1",
        name: "Browser Ops",
        endpoint: "https://example.com/mcp",
        sourceType: "external",
        availability: "available",
        toolCount: 1,
        retryable: false,
      }),
    ]);
    expect(runtime.tools.mcp_browser_ops_echo.description).toContain(
      "MCP server: Browser Ops",
    );

    const result = await runtime.tools.mcp_browser_ops_echo.execute?.(
      { value: "demo" },
      { messages: [], toolCallId: "tool-1" } as never,
    );

    expect(result).toEqual({ value: "demo" });
    await runtime.close();
  });

  it("skips unreachable MCP servers", async () => {
    const { createMCPClient } = await import("@ai-sdk/mcp");

    vi.mocked(createMCPClient)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        tools: async () => ({
          ping: {
            description: "Ping",
            inputSchema: { type: "object", properties: {} },
            execute: vi.fn(async () => ({ ok: true })),
          },
        }),
        close: vi.fn(async () => undefined),
      } as never);

    const runtime = await createConfiguredMcpToolRuntime({
      servers: [
        {
          id: "server-1",
          name: "Offline",
          endpoint: "https://offline.example.com/mcp",
          sourceType: "external",
        },
        {
          id: "server-2",
          name: "Live",
          endpoint: "https://live.example.com/mcp",
          sourceType: "external",
        },
      ],
    });

    expect(Object.keys(runtime.tools)).toEqual(["mcp_live_ping"]);
    expect(runtime.serverStatuses).toEqual([
      expect.objectContaining({
        id: "server-1",
        name: "Offline",
        endpoint: "https://offline.example.com/mcp",
        sourceType: "external",
        availability: "unavailable",
        retryable: true,
        error: "offline",
      }),
      expect.objectContaining({
        id: "server-2",
        name: "Live",
        endpoint: "https://live.example.com/mcp",
        sourceType: "external",
        availability: "available",
        toolCount: 1,
        retryable: false,
      }),
    ]);
    await runtime.close();
  });

  it("warms MCP servers and reports per-server status", async () => {
    const { createMCPClient } = await import("@ai-sdk/mcp");

    vi.mocked(createMCPClient)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        tools: async () => ({
          ping: {
            description: "Ping",
            inputSchema: { type: "object", properties: {} },
            execute: vi.fn(async () => ({ ok: true })),
          },
          pong: {
            description: "Pong",
            inputSchema: { type: "object", properties: {} },
            execute: vi.fn(async () => ({ ok: true })),
          },
        }),
        close: vi.fn(async () => undefined),
      } as never);

    const results = await warmMcpServers({
      servers: [
        {
          id: "server-1",
          name: "Offline",
          endpoint: "https://offline.example.com/mcp",
          sourceType: "external",
        },
        {
          id: "server-2",
          name: "Live",
          endpoint: "https://live.example.com/mcp",
          sourceType: "external",
        },
      ],
    });

    expect(results).toEqual([
      expect.objectContaining({
        id: "server-1",
        name: "Offline",
        endpoint: "https://offline.example.com/mcp",
        sourceType: "external",
        availability: "unavailable",
        success: false,
        toolCount: 0,
        retryable: true,
      }),
      expect.objectContaining({
        id: "server-2",
        name: "Live",
        endpoint: "https://live.example.com/mcp",
        sourceType: "external",
        availability: "available",
        success: true,
        toolCount: 2,
        retryable: false,
      }),
    ]);
  });

  it("keeps pooled MCP runtimes on standby for later tool use", async () => {
    const { createMCPClient } = await import("@ai-sdk/mcp");

    await warmPooledMcpServers({
      chatId: "chat-1",
      servers: [
        {
          id: "server-1",
          name: "Browser Ops",
          endpoint: "https://example.com/mcp",
          sourceType: "external",
        },
      ],
    });

    const runtime = await getOrCreatePooledMcpToolRuntime({
      chatId: "chat-1",
      servers: [
        {
          id: "server-1",
          name: "Browser Ops",
          endpoint: "https://example.com/mcp",
          sourceType: "external",
        },
      ],
    });

    expect(vi.mocked(createMCPClient)).toHaveBeenCalledTimes(1);
    expect(Object.keys(runtime.tools)).toEqual(["mcp_browser_ops_echo"]);
    expect(runtime.serverStatuses).toEqual([
      expect.objectContaining({
        id: "server-1",
        name: "Browser Ops",
        endpoint: "https://example.com/mcp",
        sourceType: "external",
        availability: "available",
        retryable: false,
      }),
    ]);
  });
});
