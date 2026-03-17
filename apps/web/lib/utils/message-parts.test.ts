import { describe, expect, it } from "vitest";
import {
  extractFileAttachmentsFromParts,
  normalizeMessagePartsForStorage,
  normalizeStoredMessageParts,
} from "@/lib/utils/message-parts";

describe("message part normalization", () => {
  it("wraps normalized parts into versioned storage envelopes", () => {
    const stored = normalizeMessagePartsForStorage([
      { type: "text", text: "hello" },
      {
        type: "tool-createProject",
        toolCallId: "tool-1",
        toolName: "createProject",
        state: "output-available",
        input: { name: "demo" },
        output: { success: true },
      },
    ]);

    expect(stored).toEqual([
      {
        kind: "text",
        version: 1,
        payload: { type: "text", text: "hello" },
      },
      {
        kind: "tool",
        version: 1,
        payload: {
          type: "tool-createProject",
          toolCallId: "tool-1",
          toolName: "createProject",
          state: "output-available",
          input: { name: "demo" },
          output: { success: true },
        },
      },
    ]);
  });

  it("hydrates envelope parts and legacy tool call/result pairs", () => {
    const normalized = normalizeStoredMessageParts([
      {
        kind: "text",
        version: 1,
        payload: { type: "text", text: "hello" },
      },
      {
        type: "tool-call",
        toolCallId: "tool-1",
        toolName: "createProject",
        input: { name: "demo" },
      },
      {
        type: "tool-result",
        toolCallId: "tool-1",
        toolName: "createProject",
        result: { success: true, projectId: "project-1" },
      },
    ]);

    expect(normalized).toEqual([
      { type: "text", text: "hello" },
      {
        type: "tool-createProject",
        toolCallId: "tool-1",
        toolName: "createProject",
        state: "output-available",
        input: { name: "demo" },
        output: { success: true, projectId: "project-1" },
      },
    ]);
  });

  it("extracts file attachments from enveloped parts", () => {
    expect(
      extractFileAttachmentsFromParts([
        {
          kind: "file",
          version: 1,
          payload: {
            type: "file",
            url: "https://example.com/file.txt",
            mediaType: "text/plain",
            filename: "file.txt",
          },
        },
      ]),
    ).toEqual([
      {
        url: "https://example.com/file.txt",
        mediaType: "text/plain",
        filename: "file.txt",
      },
    ]);
  });
});
