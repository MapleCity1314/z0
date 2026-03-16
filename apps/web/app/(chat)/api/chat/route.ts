import type { AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { type NextRequest, NextResponse } from "next/server";
import {
  generateTitleFromUserMessage,
  getChatById,
  getMessagesByChatId,
  readFileAsText,
  saveChat,
  saveMessages,
} from "@/components/chat/actions";
import {
  extractMemoriesFromMessage,
  formatMemoriesForContext,
  getRelevantMemories,
} from "@/lib/agent/memory/service";
import { getModelFromServer, type ModelName } from "@/lib/agent/model";
import {
  createArtifactTool,
  createZipTool,
  getCommonTools,
  getProjectTools,
  listArtifactsTool,
  listPackagesTool,
  readArtifactTool,
  saveFileTool,
  saveMultipleFilesTool,
  tavilyCrawlTool,
  tavilyExtractTool,
  tavilyMapTool,
  tavilySearchTool,
  updateArtifactTool,
} from "@/lib/agent/tools";
import {
  calculateCostUSD,
  calculateCreditsFromTokens,
  calculateUsageFromUIMessages,
} from "@/lib/agent/usage";
import { guardToolSet } from "@/lib/agent/tool-guards";
import { ChatSDKError } from "@/lib/error";
import type { DBMessage } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import {
  extractFileAttachmentsFromParts,
  normalizeStoredMessageParts,
} from "@/lib/utils/message-parts";
import { SYSTEM_PROMPT } from "./prompt";

export const maxDuration = 30;

const VALID_MODELS: ModelName[] = ["z0-mini", "z0-pro", "z0-max"];
const MEMORY_TIMEOUT_MS = 1200;

type ChatRequestPayload = {
  id: string;
  messages: UIMessage[];
  model: ModelName;
  isReasoning: boolean;
  webSearchEnabled: boolean;
  projectId: string | null;
};

type FilePart = {
  type: "file";
  url: string;
  mediaType: string;
  filename?: string;
};

type FileReadResult = {
  url: string;
  filename: string;
  mediaType: string;
  isImage: boolean;
  success: boolean;
  content: string;
  error?: string;
};

function parseRequestBody(body: unknown): ChatRequestPayload {
  const input = (body ?? {}) as {
    id?: string;
    messages?: UIMessage[];
    model?: string;
    isReasoning?: boolean;
    enableThinking?: boolean;
    webSearchEnabled?: boolean;
    projectId?: string | null;
  };

  return {
    id: input.id ?? "",
    messages: input.messages ?? [],
    model: (input.model as ModelName) ?? "z0-mini",
    isReasoning: input.isReasoning ?? input.enableThinking ?? false,
    webSearchEnabled: input.webSearchEnabled ?? false,
    projectId: input.projectId ?? null,
  };
}

function validateRequest(payload: ChatRequestPayload) {
  if (!payload.id || typeof payload.id !== "string") {
    throw new ChatSDKError(
      "bad_request:api",
      "The 'id' field is required and must be a string",
    );
  }

  if (!Array.isArray(payload.messages)) {
    throw new ChatSDKError(
      "bad_request:api",
      "The 'messages' field is required and must be an array",
    );
  }

  if (!VALID_MODELS.includes(payload.model)) {
    throw new ChatSDKError(
      "bad_request:api",
      `Model must be one of: ${VALID_MODELS.join(", ")}`,
    );
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T) {
  return Promise.race<T>([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

function extractLatestUserQuery(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "user") continue;

    return (
      message.parts
        .filter(
          (part): part is { type: "text"; text: string } =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join(" ") || ""
    );
  }

  return "";
}

function buildTools(webSearchEnabled: boolean, projectId: string | null) {
  const projectTools = getProjectTools(projectId);
  const commonTools = getCommonTools();

  return guardToolSet({
    ...(webSearchEnabled
      ? {
          tavilySearch: tavilySearchTool,
          tavilyExtract: tavilyExtractTool,
          tavilyCrawl: tavilyCrawlTool,
          tavilyMap: tavilyMapTool,
        }
      : {}),
    createArtifact: createArtifactTool,
    readArtifact: readArtifactTool,
    updateArtifact: updateArtifactTool,
    listArtifacts: listArtifactsTool,
    saveFile: saveFileTool,
    saveMultipleFiles: saveMultipleFilesTool,
    createZip: createZipTool,
    listPackages: listPackagesTool,
    ...(projectTools ?? {}),
    ...commonTools,
  });
}

function getAnthropicReasoningOptions(
  model: ModelName,
  isReasoning: boolean,
): { anthropic: AnthropicLanguageModelOptions } | undefined {
  if (!isReasoning || (model !== "z0-pro" && model !== "z0-max")) {
    return undefined;
  }

  return {
    anthropic: {
      thinking: { type: "enabled", budgetTokens: 12000 },
    },
  };
}

function addMessageMetadata(
  messages: UIMessage[],
  chatId: string,
  projectId: string | null,
  userId: string,
): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    metadata: {
      ...(typeof message.metadata === "object" && message.metadata !== null
        ? message.metadata
        : {}),
      chatId,
      projectId: projectId ?? undefined,
      userId,
    },
  }));
}

async function fetchMemoriesForPrompt(userId: string, query: string) {
  try {
    const memoryPromise =
      query.trim().length > 3
        ? getRelevantMemories(userId, query, 5)
        : getRelevantMemories(userId, undefined, 5);

    return await withTimeout(memoryPromise, MEMORY_TIMEOUT_MS, []);
  } catch (error) {
    console.warn(
      "[Server] Memory fetch failed, continuing without memory:",
      error,
    );
    return [];
  }
}

function isFilePart(part: unknown): part is FilePart {
  const maybe = part as Partial<FilePart>;
  return (
    !!maybe &&
    maybe.type === "file" &&
    typeof maybe.url === "string" &&
    typeof maybe.mediaType === "string"
  );
}

function formatFileContent(result: FileReadResult): string {
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

async function readFilePart(part: FilePart): Promise<FileReadResult> {
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

async function processMessageFiles(message: UIMessage): Promise<UIMessage> {
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

async function processAllMessageFiles(
  messages: UIMessage[],
): Promise<UIMessage[]> {
  return Promise.all(messages.map(processMessageFiles));
}

async function updateChatProjectLinkFromToolResults(
  chatId: string,
  toolResults: unknown,
) {
  if (!Array.isArray(toolResults) || toolResults.length === 0) return;

  for (const item of toolResults as Array<Record<string, unknown>>) {
    if (item?.toolName !== "createProject" || !("result" in item)) continue;

    const result = item.result as { success?: boolean; projectId?: string };
    if (!result?.success || !result.projectId) continue;

    const { updateChatProjectId } = await import("@/lib/db/queries");
    await updateChatProjectId(chatId, result.projectId);
    return;
  }
}

function buildPersistableUserMessages(
  chatId: string,
  messages: UIMessage[],
  existingMessageIds: Set<string>,
): DBMessage[] {
  return messages
    .filter(
      (message) =>
        message.role === "user" && !existingMessageIds.has(message.id),
    )
    .map((message) => {
      const fileAttachments = message.parts.filter(isFilePart).map((file) => ({
        url: file.url,
        mediaType: file.mediaType,
        filename: file.filename,
      }));

      return {
        id: message.id,
        chatId,
        role: message.role,
        parts: message.parts,
        attachments: fileAttachments,
        createdAt: new Date(),
      };
    });
}

async function runDeferredPersistence(params: {
  chatId: string;
  userId: string;
  messages: UIMessage[];
  projectId: string | null;
  isNewChat: boolean;
  userQuery: string;
}) {
  const { chatId, userId, messages, projectId, isNewChat, userQuery } = params;

  if (isNewChat) {
    const firstUserMessage = messages.find(
      (message) => message.role === "user",
    );
    const titleResult = firstUserMessage
      ? await generateTitleFromUserMessage({ message: firstUserMessage })
      : { success: false, data: "New Chat" };

    const title =
      titleResult.success && titleResult.data ? titleResult.data : "New Chat";

    const saveChatResult = await saveChat({
      id: chatId,
      title,
      userId,
      projectId: projectId ?? undefined,
    });

    if (!saveChatResult.success) {
      console.error(
        "[Server][Deferred] Failed to save chat:",
        saveChatResult.message,
      );
    }
  }

  const existingMessagesResult = await getMessagesByChatId({ id: chatId });
  const existingMessageIds = new Set(
    existingMessagesResult.success && existingMessagesResult.data
      ? existingMessagesResult.data.map((message) => message.id)
      : [],
  );

  const newUserMessages = buildPersistableUserMessages(
    chatId,
    messages,
    existingMessageIds,
  );

  if (newUserMessages.length > 0) {
    const saveResult = await saveMessages({ messages: newUserMessages });
    if (!saveResult.success) {
      console.error(
        "[Server][Deferred] Failed to save user messages:",
        saveResult.message,
      );
    }
  }

  if (userQuery.trim().length > 0) {
    await extractMemoriesFromMessage(userId, userQuery);
  }
}

function buildZ0MaxErrorHint(cause: string) {
  const sonnetModel = process.env.CLAUDE_SONNET_MODEL ?? "claude-sonnet-4-6";
  const opusModel = process.env.CLAUDE_OPUS_MODEL ?? "claude-opus-4-6";
  const anthropicBase =
    process.env.ANTHROPIC_BASE_URL ??
    process.env.CLAUDE_BASE_URL ??
    "(default)";

  return `${cause}. z0-max config hint: verify ANTHROPIC_BASE_URL points to a healthy Anthropic-compatible /v1 endpoint, and verify model IDs exist and are enabled on that endpoint. Current sonnet="${sonnetModel}", opus="${opusModel}", base="${anthropicBase}".`;
}

export async function POST(request: NextRequest) {
  let requestedModel: string | undefined;

  try {
    const payload = parseRequestBody(await request.json());
    requestedModel = payload.model;
    validateRequest(payload);

    console.log("[Server] Received request", {
      chatId: payload.id,
      model: payload.model,
      isReasoning: payload.isReasoning,
      webSearchEnabled: payload.webSearchEnabled,
      projectId: payload.projectId || "none",
      messageCount: payload.messages.length,
    });

    // Start expensive work in parallel early.
    const userPromise = getCurrentUser();
    const chatPromise = getChatById({ id: payload.id });
    const processedMessagesPromise = processAllMessageFiles(payload.messages);

    const [user, chatResult] = await Promise.all([userPromise, chatPromise]);

    if (!user?.id) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    let isNewChat = false;
    if (chatResult.success && chatResult.data) {
      if (chatResult.data.userId !== user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    } else {
      isNewChat = true;
    }

    const userQuery = extractLatestUserQuery(payload.messages);
    const memoriesPromise = fetchMemoriesForPrompt(user.id, userQuery);

    const [processedMessages, memories] = await Promise.all([
      processedMessagesPromise,
      memoriesPromise,
    ]);

    const allMessages = addMessageMetadata(
      processedMessages,
      payload.id,
      payload.projectId,
      user.id,
    );

    const systemPrompt = SYSTEM_PROMPT + formatMemoriesForContext(memories);
    const modelMessages = await convertToModelMessages(allMessages);

    const tools = buildTools(payload.webSearchEnabled, payload.projectId);
    const providerOptions = getAnthropicReasoningOptions(
      payload.model,
      payload.isReasoning,
    );

    const result = streamText({
      model: getModelFromServer(payload.model, {
        isReasoning: payload.isReasoning,
      }) as Parameters<typeof streamText>[0]["model"],
      system: systemPrompt,
      messages: modelMessages,
      providerOptions,
      temperature: 0.7,
      stopWhen: stepCountIs(20),
      tools,
      toolChoice: "auto",
      onFinish: async ({ finishReason, toolCalls, toolResults, usage }) => {
        console.log("[Server] Stream finished", {
          finishReason,
          toolCalls: toolCalls?.length || 0,
          usage,
        });

        await updateChatProjectLinkFromToolResults(payload.id, toolResults);

        const aiUsage = calculateUsageFromUIMessages(allMessages);
        const credits = calculateCreditsFromTokens(
          aiUsage.promptTokens,
          aiUsage.completionTokens,
        );
        const costUSD = calculateCostUSD(aiUsage);

        console.log("[Server] Usage summary", {
          usage: aiUsage,
          credits,
          costUSD,
        });
      },
      onError: (error) => {
        console.error("[Server] Stream error:", error);
      },
    });

    runDeferredPersistence({
      chatId: payload.id,
      userId: user.id,
      messages: payload.messages,
      projectId: payload.projectId,
      isNewChat,
      userQuery,
    }).catch((error) => {
      console.error("[Server][Deferred] Failed:", error);
    });

    return result.toUIMessageStreamResponse({
      originalMessages: allMessages,
      generateMessageId: () => crypto.randomUUID(),
      sendReasoning: true,
      sendSources: true,
      onFinish: async ({ responseMessage }) => {
        if (responseMessage.role !== "assistant") return;

        const normalizedParts = normalizeStoredMessageParts(
          responseMessage.parts,
        );
        const assistantMessage: DBMessage = {
          id: responseMessage.id || crypto.randomUUID(),
          chatId: payload.id,
          role: "assistant",
          parts: normalizedParts,
          attachments: extractFileAttachmentsFromParts(normalizedParts),
          createdAt: new Date(),
        };

        const saveResult = await saveMessages({ messages: [assistantMessage] });
        if (!saveResult.success) {
          console.error(
            "[Server] Failed to persist assistant message:",
            saveResult.message,
          );
        }
      },
    });
  } catch (error) {
    console.error("[Server] API error:", error);

    let cause =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : JSON.stringify(error);

    if (
      requestedModel === "z0-max" &&
      (cause.toLowerCase().includes("not found") ||
        cause.toLowerCase().includes("service unavailable") ||
        cause.includes("503"))
    ) {
      cause = buildZ0MaxErrorHint(cause);
    }

    return NextResponse.json(
      {
        code: "bad_request:api",
        message: "Failed to process chat request",
        cause,
      },
      { status: 500 },
    );
  }
}
