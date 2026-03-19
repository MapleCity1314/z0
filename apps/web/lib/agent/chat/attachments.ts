import type { UIMessage } from "ai";
import { readFileAsText } from "@/lib/chat";
import type { FilePart, FileReadResult } from "@/lib/agent/chat/request";
import { isFilePart } from "@/lib/agent/chat/request";

export function formatFileContent(result: FileReadResult): string {
  const extension = result.filename.split(".").pop()?.toLowerCase() || "";

  if (result.isImage) {
    return `[OCR Text from Image: ${result.filename}]\n${result.content}\n[End of OCR Text]`;
  }

  if (
    [
      "js",
      "jsx",
      "ts",
      "tsx",
      "py",
      "java",
      "go",
      "rs",
      "rb",
      "php",
      "c",
      "cpp",
      "cs",
      "swift",
      "kt",
    ].includes(extension)
  ) {
    return `\`\`\`${extension}\n${result.content}\n\`\`\``;
  }

  if (["json", "xml", "html", "csv"].includes(extension)) {
    return `\`\`\`${extension}\n${result.content}\n\`\`\``;
  }

  return result.content;
}

export async function readFilePart(part: FilePart): Promise<FileReadResult> {
  const filename = part.filename || "unknown";
  const mediaType = part.mediaType || "application/octet-stream";
  const isImage = mediaType.startsWith("image/");

  const result = await readFileAsText({
    file: part.url,
    filename,
    mimeType: mediaType,
  });

  return {
    url: part.url,
    filename,
    mediaType,
    isImage,
    success: result.success,
    content: result.data || "",
    error: result.success ? undefined : result.message,
  };
}

export async function processMessageFiles(
  message: UIMessage,
): Promise<UIMessage> {
  if (message.role !== "user") return message;

  const fileParts = message.parts.filter(isFilePart);
  if (fileParts.length === 0) return message;

  const fileResults = await Promise.all(fileParts.map(readFilePart));
  const fileResultMap = new Map(
    fileResults.map((result) => [result.url, result]),
  );

  const parts = message.parts.map((part) => {
    if (!isFilePart(part)) return part;

    const fileResult = fileResultMap.get(part.url);
    if (!fileResult) return part;

    if (fileResult.success && fileResult.content) {
      const formattedContent = formatFileContent(fileResult);
      return {
        type: "text" as const,
        text: `\n[File: ${fileResult.filename}]\n${formattedContent}\n[End of File]\n`,
      };
    }

    return {
      type: "text" as const,
      text: `\n[File: ${fileResult.filename} - Processing failed: ${fileResult.error}]\n`,
    };
  });

  return {
    ...message,
    parts,
  };
}

export async function processAllMessageFiles(messages: UIMessage[]) {
  return Promise.all(messages.map(processMessageFiles));
}
