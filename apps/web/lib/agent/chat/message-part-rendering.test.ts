import type { UIMessage, UIMessagePart } from "ai";
import { describe, expect, it } from "vitest";
import {
  getDataPartName,
  getMessageCopyText,
  getToolName,
  getToolTaskInfo,
  getToolTaskStatus,
  isDataPart,
  isToolPart,
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
