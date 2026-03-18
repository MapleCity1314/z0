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

  it("parses both success and error responses", () => {
    expect(
      parseToolBridgeResponse(createToolBridgeSuccessResponse({ ok: true })),
    ).toEqual({
      data: { ok: true },
    });

    expect(
      parseToolBridgeResponse(createToolBridgeErrorResponse("broken")),
    ).toEqual({
      error: {
        message: "broken",
      },
    });
  });
});
