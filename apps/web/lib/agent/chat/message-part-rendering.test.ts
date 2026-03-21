import type { UIMessage, UIMessagePart } from "ai";
import { describe, expect, it } from "vitest";
import {
  getDataPartName,
  getMessageCopyText,
  getToolName,
  getToolTaskInfo,
  getToolTaskStatus,
  isDataPart,
  isSearchToolPart,
  isSearchToolName,
  isToolPart,
  shouldRenderMessagePartInBody,
  resolveDataRendererKind,
  resolveMessageRendererKind,
  resolveToolRendererKind,
} from "./message-part-rendering";

describe("message-part-rendering", () => {
  it("detects tool and data parts", () => {
    const toolPart = {
      type: "tool-runBuild",
      toolCallId: "call-1",
      state: "input-available",
      input: {},
    } as UIMessagePart<any, any>;
    const dataPart = { type: "data-image", data: {} } as UIMessagePart<
      any,
      any
    >;
    const textPart = { type: "text", text: "hello" } as UIMessagePart<any, any>;

    expect(isToolPart(toolPart)).toBe(true);
    expect(isDataPart(toolPart)).toBe(false);
    expect(isDataPart(dataPart)).toBe(true);
    expect(isToolPart(textPart)).toBe(false);
  });

  it("copies only text parts", () => {
    const message = {
      id: "m1",
      role: "assistant",
      parts: [
        { type: "text", text: "hello" },
        {
          type: "file",
          mediaType: "text/plain",
          filename: "a.txt",
          url: "/a.txt",
        },
        { type: "text", text: "world" },
      ],
    } as UIMessage;

    expect(getMessageCopyText(message)).toBe("hello\nworld");
  });

  it("includes data-error parts in copied text", () => {
    const message = {
      id: "m2",
      role: "assistant",
      parts: [
        { type: "text", text: "Partial response" },
        {
          type: "data-error",
          data: {
            title: "Error",
            message: "Something went wrong. Please try again later.",
            cause: "Agent API returned 500",
            timestamp: "2026-03-21T12:00:00.000Z",
          },
        },
      ],
    } as UIMessage;

    expect(getMessageCopyText(message)).toBe(
      [
        "Partial response",
        "Error: Something went wrong. Please try again later.",
        "Cause: Agent API returned 500",
      ].join("\n"),
    );
  });

  it("maps tool state to task status", () => {
    expect(getToolTaskStatus("input-streaming")).toBe("running");
    expect(getToolTaskStatus("output-error")).toBe("error");
    expect(getToolTaskStatus("output-available")).toBe("success");
  });

  it("resolves tool and data names", () => {
    const toolPart = {
      type: "tool-runBuild",
      toolCallId: "call-1",
      state: "input-available",
      input: {},
    } as UIMessagePart<any, any>;
    const dataPart = { type: "data-plan", data: {} } as UIMessagePart<any, any>;

    expect(getToolName(toolPart)).toBe("runBuild");
    expect(getDataPartName(dataPart)).toBe("plan");
  });

  it("recognizes search tools and hides them from message body rendering", () => {
    const searchToolPart = {
      type: "tool-tavilySearch",
      toolCallId: "call-search",
      state: "output-available",
      input: { query: "latest next.js" },
      output: { results: [] },
    } as UIMessagePart<any, any>;

    expect(isSearchToolName("tavilySearch")).toBe(true);
    expect(isSearchToolPart(searchToolPart)).toBe(true);
    expect(shouldRenderMessagePartInBody(searchToolPart)).toBe(false);
    expect(
      shouldRenderMessagePartInBody({
        type: "reasoning",
        text: "## Plan\nCheck sources",
      } as UIMessagePart<any, any>),
    ).toBe(false);
    expect(
      shouldRenderMessagePartInBody({
        type: "tool-runBuild",
        toolCallId: "call-build",
        state: "output-available",
        input: {},
        output: {},
      } as UIMessagePart<any, any>),
    ).toBe(true);
  });

  it("resolves message renderer kinds", () => {
    expect(
      resolveMessageRendererKind({
        type: "text",
        text: "hello",
      } as UIMessagePart<any, any>),
    ).toBe("text");
    expect(
      resolveMessageRendererKind({
        type: "tool-readArtifact",
        toolCallId: "call-1",
        state: "output-available",
        input: {},
        output: {},
      } as UIMessagePart<any, any>),
    ).toBe("tool");
    expect(
      resolveMessageRendererKind({ type: "step-start" } as UIMessagePart<
        any,
        any
      >),
    ).toBe("step-start");
  });

  it("resolves renderer variants for tool and data parts", () => {
    expect(
      resolveToolRendererKind("createArtifact", { output: { code: "x" } }),
    ).toBe("artifact");
    expect(resolveToolRendererKind("readArtifact", {})).toBe("inspector");
    expect(resolveToolRendererKind("runBuild", {})).toBe("task");
    expect(resolveDataRendererKind("plan")).toBe("plan");
    expect(resolveDataRendererKind("error")).toBe("error");
    expect(resolveDataRendererKind("custom")).toBe("json");
  });

  it("derives task info for known tools", () => {
    expect(
      getToolTaskInfo("createProject", { name: "demo" }, undefined, true),
    ).toEqual({
      title: "Creating new project...",
      subtitle: "demo",
    });
  });

  it("falls back for unknown tools", () => {
    expect(getToolTaskInfo("customTool", undefined, undefined, false)).toEqual({
      title: "customTool completed",
    });
  });
});
