import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { NextRequest } from "next/server";

const buildAgentTools = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => []),
      })),
    })),
  })),
}));
const createInternalAuthHeaders = vi.hoisted(() =>
  vi.fn(
    ({
      actor,
      purpose,
    }: {
      actor: { userId: string; role: string };
      purpose: string;
    }) => ({
      "x-internal-actor-id": actor.userId,
      "x-internal-actor-role": actor.role,
      "x-internal-auth-purpose": purpose,
    }),
  ),
);
const verifyInternalAuthHeaders = vi.hoisted(() =>
  vi.fn((headers: Headers, purpose: string) => {
    if (headers.get("x-internal-auth-purpose") !== purpose) {
      return null;
    }

    const userId = headers.get("x-internal-actor-id");
    if (!userId) {
      return null;
    }

    return {
      userId,
      role: headers.get("x-internal-actor-role") ?? "user",
    };
  }),
);
const parseToolBridgeRequestBody = vi.hoisted(() =>
  vi.fn((body: unknown) => {
    const input = (body ?? {}) as Record<string, unknown>;

    return {
      chatId: typeof input.chatId === "string" ? input.chatId : undefined,
      projectId:
        typeof input.projectId === "string" || input.projectId === null
          ? (input.projectId as string | null)
          : null,
      webSearchEnabled:
        typeof input.webSearchEnabled === "boolean"
          ? input.webSearchEnabled
          : false,
      toolCallId:
        typeof input.toolCallId === "string" ? input.toolCallId : undefined,
      input: input.input ?? {},
      context:
        typeof input.context === "object" && input.context !== null
          ? input.context
          : undefined,
    };
  }),
);
const createToolBridgeErrorResponse = vi.hoisted(() =>
  vi.fn(
    ({
      code,
      message,
      status,
      retryable,
      toolName,
    }: {
      code: string;
      message: string;
      status: number;
      retryable?: boolean;
      toolName?: string;
    }) => ({
      error: { code, message, status, retryable, toolName },
    }),
  ),
);
const createToolBridgeSuccessResponse = vi.hoisted(() =>
  vi.fn((data: unknown) => ({
    data,
  })),
);
const normalizeToolBridgeExecutionError = vi.hoisted(() =>
  vi.fn(
    ({
      error,
      toolName,
      fallbackMessage,
    }: {
      error: unknown;
      toolName: string;
      fallbackMessage?: string;
    }) => {
      if (error instanceof ZodError) {
        return {
          error: {
            code: "bad_request:tool_bridge",
            message: "Invalid tool input",
            status: 400,
            retryable: false,
            toolName,
          },
        };
      }

      const status =
        typeof (error as { status?: unknown })?.status === "number" &&
        (error as { status: number }).status >= 400 &&
        (error as { status: number }).status <= 599
          ? (error as { status: number }).status
          : 500;

      return {
        error: {
          code: status === 400 ? "bad_request:tool_bridge" : "failed:tool_bridge",
          message:
            status >= 500
              ? (fallbackMessage ?? "Tool execution failed")
              : error instanceof Error
                ? error.message
                : "Tool execution failed",
          status,
          retryable: status >= 500,
          toolName,
        },
      };
    },
  ),
);

vi.mock("@z0/backend", () => ({
  createInternalAuthHeaders,
  verifyInternalAuthHeaders,
  parseToolBridgeRequestBody,
  createToolBridgeErrorResponse,
  createToolBridgeSuccessResponse,
  normalizeToolBridgeExecutionError,
}));

vi.mock("@/lib/agent/chat/tools", () => ({
  buildAgentTools,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

describe("agent tool bridge route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AGENT_BRIDGE_TOKEN = "bridge-token";
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    expect(await response.json()).toEqual({
      error: {
        code: "forbidden:tool_bridge",
        message: "Forbidden",
        status: 403,
        retryable: undefined,
        toolName: undefined,
      },
    });
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
        webSearchEnabled: true,
        toolCallId: "tool-1",
        input: { foo: "bar" },
      }),
      headers: {
        "content-type": "application/json",
        ...createInternalAuthHeaders({
          actor: { userId: "user-1", role: "user" },
          purpose: "agent-bridge",
        }),
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ toolName: "demoTool" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(buildAgentTools).toHaveBeenCalledWith(true, null);
    expect(payload.data).toMatchObject({
      input: { foo: "bar" },
      context: {
        toolCallId: "tool-1",
        messages: {
          projectId: null,
        },
      },
    });
  });

  it("rejects invalid tool input before execution", async () => {
    const execute = vi.fn();

    buildAgentTools.mockReturnValue({
      demoTool: {
        inputSchema: {
          parse: vi.fn(() => {
            throw new ZodError([]);
          }),
        },
        execute,
      },
    });

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/agent/tools/demoTool", {
      method: "POST",
      body: JSON.stringify({
        webSearchEnabled: true,
        input: {},
      }),
      headers: {
        "content-type": "application/json",
        ...createInternalAuthHeaders({
          actor: { userId: "user-1", role: "user" },
          purpose: "agent-bridge",
        }),
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ toolName: "demoTool" }),
    });

    expect(response.status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: {
        code: "bad_request:tool_bridge",
        message: "Invalid tool input",
        status: 400,
        retryable: false,
        toolName: "demoTool",
      },
    });
  });

  it("returns a bridge error when the tool is missing", async () => {
    buildAgentTools.mockReturnValue({});

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/agent/tools/missing", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
        ...createInternalAuthHeaders({
          actor: { userId: "user-1", role: "user" },
          purpose: "agent-bridge",
        }),
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ toolName: "missing" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      error: {
        code: "not_found:tool_bridge",
        message: "Unknown agent tool: missing",
        status: 404,
        retryable: undefined,
        toolName: "missing",
      },
    });
  });

  it("returns a bad request bridge error when the payload is invalid", async () => {
    parseToolBridgeRequestBody.mockImplementationOnce(() => {
      throw new Error("invalid request");
    });

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/agent/tools/demoTool", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
        ...createInternalAuthHeaders({
          actor: { userId: "user-1", role: "user" },
          purpose: "agent-bridge",
        }),
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ toolName: "demoTool" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "bad_request:tool_bridge",
        message: "invalid request",
        status: 400,
        retryable: undefined,
        toolName: "demoTool",
      },
    });
  });

  it("sanitizes retryable tool execution failures", async () => {
    buildAgentTools.mockReturnValue({
      demoTool: {
        execute: vi.fn(async () => {
          throw new Error("database connection string leaked");
        }),
      },
    });

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/agent/tools/demoTool", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
        ...createInternalAuthHeaders({
          actor: { userId: "user-1", role: "user" },
          purpose: "agent-bridge",
        }),
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ toolName: "demoTool" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "failed:tool_bridge",
        message: "Tool execution failed",
        status: 500,
        retryable: true,
        toolName: "demoTool",
      },
    });
  });

  it("returns non-retryable bad requests for zod execution failures", async () => {
    buildAgentTools.mockReturnValue({
      demoTool: {
        execute: vi.fn(async () => {
          throw new ZodError([]);
        }),
      },
    });

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/agent/tools/demoTool", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
        ...createInternalAuthHeaders({
          actor: { userId: "user-1", role: "user" },
          purpose: "agent-bridge",
        }),
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ toolName: "demoTool" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "bad_request:tool_bridge",
        message: "Invalid tool input",
        status: 400,
        retryable: false,
        toolName: "demoTool",
      },
    });
  });
});
