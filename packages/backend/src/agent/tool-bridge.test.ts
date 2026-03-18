import { describe, expect, it } from "vitest";
import {
  createToolBridgeErrorResponse,
  createToolBridgeSuccessResponse,
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
});
