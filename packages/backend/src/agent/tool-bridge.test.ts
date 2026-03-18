import { describe, expect, it } from "vitest";
import {
  createToolBridgeErrorResponse,
  createToolBridgeSuccessResponse,
  getToolBridgeErrorStatus,
  normalizeToolBridgeExecutionError,
  parseToolBridgeRequestBody,
  parseToolBridgeResponse,
} from "./tool-bridge";

describe("agent tool bridge contract", () => {
  it("applies defaults to bridge requests", () => {
    expect(parseToolBridgeRequestBody({})).toEqual({
      chatId: undefined,
      projectId: null,
      webSearchEnabled: false,
      toolCallId: undefined,
      input: {},
      context: undefined,
    });
  });

  it("parses both success and structured error responses", () => {
    expect(
      parseToolBridgeResponse(createToolBridgeSuccessResponse({ ok: true })),
    ).toEqual({
      data: { ok: true },
    });

    expect(
      parseToolBridgeResponse(
        createToolBridgeErrorResponse({
          code: "failed:tool_bridge",
          message: "broken",
          status: 500,
          retryable: true,
          toolName: "demoTool",
        }),
      ),
    ).toEqual({
      error: {
        code: "failed:tool_bridge",
        message: "broken",
        status: 500,
        retryable: true,
        toolName: "demoTool",
      },
    });
  });

  it("upgrades legacy message-only bridge errors", () => {
    expect(
      parseToolBridgeResponse({
        error: {
          message: "legacy failure",
        },
      }),
    ).toEqual({
      error: {
        code: "failed:tool_bridge",
        message: "legacy failure",
        status: 500,
        retryable: undefined,
        toolName: undefined,
      },
    });
  });

  it("normalizes zod execution failures as non-retryable bad requests", async () => {
    const { z } = await import("zod");

    expect(
      normalizeToolBridgeExecutionError({
        error: new z.ZodError([]),
        toolName: "demoTool",
      }),
    ).toEqual({
      error: {
        code: "bad_request:tool_bridge",
        message: "Invalid tool input",
        status: 400,
        retryable: false,
        toolName: "demoTool",
      },
    });
  });

  it("sanitizes retryable 5xx execution failures", () => {
    expect(
      normalizeToolBridgeExecutionError({
        error: new Error("database connection leaked details"),
        toolName: "demoTool",
      }),
    ).toEqual({
      error: {
        code: "failed:tool_bridge",
        message: "Tool execution failed",
        status: 500,
        retryable: true,
        toolName: "demoTool",
      },
    });
  });

  it("infers response statuses from bridge execution failures", async () => {
    const { z } = await import("zod");

    expect(getToolBridgeErrorStatus(new z.ZodError([]))).toBe(400);
    expect(getToolBridgeErrorStatus({ status: 429 })).toBe(429);
    expect(getToolBridgeErrorStatus(new Error("boom"))).toBe(500);
  });
});
