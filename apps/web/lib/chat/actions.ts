"use server";

import { ChatSDKError } from "@/lib/error";
import { kimi } from "@/lib/agent/model";
import {
  type AgentRun,
  type Chat,
  type DBMessage,
  type ToolCall,
} from "@/lib/schema";
import { generateText, type UIMessage } from "ai";
import { isFilePart } from "@z0/backend/agent/request";
import * as queries from "@/lib/db/queries";
import { extractTextFromImage } from "@/lib/agent/ocr";
import {
  parsePDF,
  parseDocx,
  parseXlsx,
  parseCsv,
  parseJson,
  parseXml,
  detectAndConvert,
  extractMetadata,
} from "@/lib/utils/file-parser";
import { normalizeMessagePartsForStorage } from "@/lib/utils/message-parts";
import { linkUserDefaultIntegrationsToChat } from "@/lib/db/integrations";

type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

const DEFAULT_CHAT_TITLE = "New Chat";
const GREETING_CHAT_TITLE = "Greeting";

function extractTextFromUIMessage(message: UIMessage): string {
  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGreetingLikeMessage(text: string): boolean {
  const normalized = text.toLowerCase().trim();

  if (!normalized) return true;

  const greetingPatterns = [
    /^(hi|hello|hey|yo|sup|howdy|hola)\b[!.? ]*$/,
    /^(good (morning|afternoon|evening))\b[!.? ]*$/,
    /^(你好|您好|哈喽|嗨|早上好|下午好|晚上好)[！!。.? ]*$/,
    /^(在吗|在嗎|有人吗|有人嗎)[？? ]*$/,
  ];

  return greetingPatterns.some((pattern) => pattern.test(normalized));
}

function sanitizeGeneratedTitle(title: string, fallback: string): string {
  const cleaned = title
    .replace(/[\r\n\t]/g, " ")
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "")
    .replace(/[:：]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return fallback;

  return cleaned.length > 80 ? cleaned.slice(0, 80).trim() : cleaned;
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}): Promise<ActionResult<string>> {
  const userText = extractTextFromUIMessage(message);

  if (!userText) {
    return {
      success: true,
      message: "Fallback title used",
      data: DEFAULT_CHAT_TITLE,
    };
  }

  if (isGreetingLikeMessage(userText)) {
    return {
      success: true,
      message: "Greeting title used",
      data: GREETING_CHAT_TITLE,
    };
  }

  try {
    const { text } = await generateText({
      model: kimi("moonshot-v1-8k"),
      system: [
        "You generate chat titles only.",
        "Output exactly one short title, not a sentence reply.",
        "Do not answer the user.",
        "Do not include quotes or colons.",
        "Max 80 characters.",
      ].join(" "),
      prompt: `User first message:\n${userText}\n\nReturn title only.`,
    });

    const title = sanitizeGeneratedTitle(text, DEFAULT_CHAT_TITLE);

    return {
      success: true,
      message: "Title generated successfully",
      data: title,
    };
  } catch (error) {
    const fallbackTitle = sanitizeGeneratedTitle(userText, DEFAULT_CHAT_TITLE);

    return {
      success: true,
      message: error instanceof Error ? error.message : "Fallback title used",
      data: fallbackTitle,
    };
  }
}

export async function getChatById({
  id,
}: {
  id: string;
}): Promise<ActionResult<Chat>> {
  try {
    const chat = await queries.getChatById(id);

    if (!chat) {
      return {
        success: false,
        message: "Chat not found",
      };
    }

    return {
      success: true,
      message: "Chat retrieved successfully",
      data: chat,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ChatSDKError ? error.message : "Failed to get chat",
    };
  }
}

export async function saveMessages({
  messages,
}: {
  messages: DBMessage[];
}): Promise<ActionResult> {
  try {
    console.log(
      "[saveMessages Action] 🚀 Starting to save",
      messages.length,
      "message(s)",
    );
    await queries.saveMessages(messages);

    console.log("[saveMessages Action] Messages saved successfully");
    return {
      success: true,
      message: "Messages saved successfully",
    };
  } catch (error) {
    console.error("[saveMessages Action] Error:", error);
    console.error("[saveMessages Action] 📋 Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save messages",
    };
  }
}

export async function persistAssistantMessageAction({
  chatId,
  message,
}: {
  chatId: string;
  message: UIMessage;
}): Promise<ActionResult> {
  const fileAttachments = message.parts.filter(isFilePart).map((file) => ({
    url: file.url,
    mediaType: file.mediaType,
    filename: file.filename,
  }));

  return saveMessages({
    messages: [
      {
        id: message.id,
        chatId,
        role: message.role,
        parts: normalizeMessagePartsForStorage(message.parts),
        attachments: fileAttachments,
        createdAt: new Date(),
      },
    ],
  });
}

export async function saveAgentRun({
  run,
}: {
  run: Omit<AgentRun, "createdAt" | "updatedAt"> & {
    createdAt?: Date;
    updatedAt?: Date;
  };
}): Promise<ActionResult<AgentRun>> {
  try {
    const data = await queries.saveAgentRun(run);

    return {
      success: true,
      message: "Agent run saved successfully",
      data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save agent run",
    };
  }
}

export async function saveToolCalls({
  calls,
}: {
  calls: ToolCall[];
}): Promise<ActionResult> {
  try {
    await queries.saveToolCalls(calls);

    return {
      success: true,
      message: "Tool calls saved successfully",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save tool calls",
    };
  }
}

export async function getMessagesByChatId({
  id,
}: {
  id: string;
}): Promise<ActionResult<DBMessage[]>> {
  try {
    const messages = await queries.getMessagesByChatId(id);

    return {
      success: true,
      message: "Messages retrieved successfully",
      data: messages,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ChatSDKError
          ? error.message
          : "Failed to get messages",
    };
  }
}

export async function getRecentChats(): Promise<ActionResult<Chat[]>> {
  try {
    const user = await import("@/lib/session").then((m) => m.getCurrentUser());

    if (!user?.id) {
      return {
        success: false,
        message: "User not authenticated",
        data: [],
      };
    }

    const chats = await queries.getChatsByUserId(user.id);

    return {
      success: true,
      message: "Chats retrieved successfully",
      data: chats,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ChatSDKError ? error.message : "Failed to get chats",
    };
  }
}

export async function saveChat({
  id,
  title,
  userId,
  projectId,
}: {
  id: string;
  title: string;
  userId: string;
  projectId?: string;
}): Promise<ActionResult<Chat>> {
  try {
    console.log("[saveChat] 🚀 Starting chat creation:", {
      id,
      title,
      userId,
      projectId,
    });

    const chat = await queries.createChat({
      id,
      title,
      userId,
      projectId,
      createdAt: new Date(),
    });

    try {
      await linkUserDefaultIntegrationsToChat({ userId, chatId: id });
    } catch (integrationError) {
      console.warn(
        "[saveChat] Failed to link default integrations:",
        integrationError,
      );
    }

    console.log("[saveChat] Chat created successfully:", chat);

    return {
      success: true,
      message: "Chat created successfully",
      data: chat,
    };
  } catch (error) {
    console.error("[saveChat] Error creating chat:", error);
    console.error("[saveChat] 📋 Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      raw: error,
    });

    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create chat",
    };
  }
}

export async function deleteChat({
  id,
}: {
  id: string;
}): Promise<ActionResult> {
  try {
    const user = await import("@/lib/session").then((m) => m.getCurrentUser());

    if (!user?.id) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    // Verify ownership
    const chat = await queries.getChatById(id);
    if (!chat || chat.userId !== user.id) {
      return {
        success: false,
        message: "Chat not found or access denied",
      };
    }

    await queries.deleteChat(id);

    return {
      success: true,
      message: "Chat deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof ChatSDKError ? error.message : "Failed to delete chat",
    };
  }
}

/**
 * Enhanced file reading function - converts various file types to text
 * Supports: images, PDFs, Office documents, text files, code files, etc.
 */
export async function readFileAsText({
  file,
  filename,
  mimeType,
}: {
  file: string; // Base64 data URL or URL
  filename: string;
  mimeType: string;
}): Promise<ActionResult<string>> {
  try {
    const metadata = extractMetadata(filename, mimeType);
    const fileExtension = metadata.extension;

    // Validate data URL format
    if (!file.startsWith("data:")) {
      return {
        success: false,
        message: "Only data URLs are supported. File must be in base64 format.",
      };
    }

    const base64Data = file.split(",")[1];
    if (!base64Data) {
      return {
        success: false,
        message: "Invalid data URL format",
      };
    }

    const buffer = Buffer.from(base64Data, "base64");

    // Image files - use OCR
    if (metadata.isImage) {
      const result = await extractTextFromImage(file, filename);

      if (result.error) {
        return {
          success: false,
          message: `OCR failed: ${result.error}`,
        };
      }

      return {
        success: true,
        message: `Image text extracted (${result.text.length} chars)`,
        data: result.text,
      };
    }

    // PDF files - try to parse if library available
    if (fileExtension === "pdf") {
      try {
        const text = await parsePDF(buffer);
        return {
          success: true,
          message: `PDF parsed successfully (${text.length} chars)`,
          data: text,
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "PDF parsing failed. Install: pnpm add pdf-parse",
        };
      }
    }

    // Word documents (.docx)
    if (fileExtension === "docx") {
      try {
        const text = await parseDocx(buffer);
        return {
          success: true,
          message: `Word document parsed (${text.length} chars)`,
          data: text,
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "DOCX parsing failed. Install: pnpm add mammoth",
        };
      }
    }

    // Excel files (.xlsx)
    if (fileExtension === "xlsx") {
      try {
        const text = await parseXlsx(buffer);
        return {
          success: true,
          message: `Excel file parsed (${text.length} chars)`,
          data: text,
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "XLSX parsing failed. Install: pnpm add xlsx",
        };
      }
    }

    // Legacy Office formats
    if (["doc", "xls", "ppt", "pptx"].includes(fileExtension)) {
      return {
        success: false,
        message: `Legacy Office format (.${fileExtension}) not supported. Please convert to modern format (.docx, .xlsx, .pptx) or PDF.`,
      };
    }

    // Text-based files
    if (metadata.isText || metadata.isCode) {
      const textContent = detectAndConvert(buffer);

      // Apply format-specific parsing
      let formattedContent = textContent;

      if (fileExtension === "json") {
        formattedContent = parseJson(textContent);
      } else if (fileExtension === "xml") {
        formattedContent = parseXml(textContent);
      } else if (fileExtension === "csv") {
        formattedContent = parseCsv(textContent);
      }

      return {
        success: true,
        message: `${metadata.category} file read successfully (${formattedContent.length} chars)`,
        data: formattedContent,
      };
    }

    // Fallback for unknown types
    return {
      success: false,
      message: `Unsupported file type: ${mimeType} (.${fileExtension}). Supported: images, text, code, PDF (with pdf-parse), Office docs (with mammoth/xlsx).`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to read file",
    };
  }
}

/**
 * Batch process multiple files
 */
export async function readFilesAsText({
  files,
}: {
  files: Array<{ file: string; filename: string; mimeType: string }>;
}): Promise<
  ActionResult<Array<{ filename: string; content: string; success: boolean }>>
> {
  try {
    const results = await Promise.all(
      files.map(async (fileData) => {
        const result = await readFileAsText(fileData);
        return {
          filename: fileData.filename,
          content: result.data || "",
          success: result.success,
        };
      }),
    );

    const successCount = results.filter((r) => r.success).length;

    return {
      success: true,
      message: `Processed ${successCount}/${files.length} files successfully`,
      data: results,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to process files",
    };
  }
}
