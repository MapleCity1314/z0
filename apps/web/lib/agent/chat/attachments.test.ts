import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  readFileAsText: vi.fn(),
}));

vi.mock("@/lib/chat", () => actions);

describe("agent chat attachment helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats code and image file content", async () => {
    const { formatFileContent } = await import("@/lib/agent/chat/attachments");

    expect(
      formatFileContent({
        url: "https://example.com/app.ts",
        filename: "app.ts",
        mediaType: "text/plain",
        isImage: false,
        success: true,
        content: "export const x = 1;",
      }),
    ).toContain("```ts");

    expect(
      formatFileContent({
        url: "https://example.com/image.png",
        filename: "image.png",
        mediaType: "image/png",
        isImage: true,
        success: true,
        content: "detected text",
      }),
    ).toContain("[OCR Text from Image: image.png]");
  });

  it("replaces file parts with extracted text content", async () => {
    actions.readFileAsText.mockResolvedValue({
      success: true,
      data: "hello world",
    });

    const { processMessageFiles } = await import(
      "@/lib/agent/chat/attachments"
    );

    const processed = await processMessageFiles({
      id: "m1",
      role: "user",
      parts: [
        {
          type: "file",
          url: "https://example.com/file.txt",
          mediaType: "text/plain",
          filename: "file.txt",
        },
      ],
    });

    expect(processed.parts).toEqual([
      {
        type: "text",
        text: "\n[File: file.txt]\nhello world\n[End of File]\n",
      },
    ]);
  });

  it("surfaces failed file processing as message text", async () => {
    actions.readFileAsText.mockResolvedValue({
      success: false,
      message: "unsupported file",
    });

    const { processMessageFiles } = await import(
      "@/lib/agent/chat/attachments"
    );

    const processed = await processMessageFiles({
      id: "m1",
      role: "user",
      parts: [
        {
          type: "file",
          url: "https://example.com/file.bin",
          mediaType: "application/octet-stream",
          filename: "file.bin",
        },
      ],
    });

    expect(processed.parts).toEqual([
      {
        type: "text",
        text: "\n[File: file.bin - Processing failed: unsupported file]\n",
      },
    ]);
  });
});
