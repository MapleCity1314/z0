import type { UIMessage } from "ai";
import type { AgentRunTelemetry } from "@z0/backend/agent/telemetry";
import {
  buildAgentRunRecord,
  buildToolCallRecords,
} from "@z0/backend/agent/telemetry";
import { isFilePart } from "@z0/backend/agent/request";
export { buildAgentRunRecord, buildToolCallRecords } from "@z0/backend/agent/telemetry";
import type { DBMessage } from "@/lib/schema";
import { extractMemoriesFromMessage } from "@/lib/agent/memory/service";
import {
  generateTitleFromUserMessage,
  getMessagesByChatId,
  saveAgentRun,
  saveChat,
  saveMessages,
  saveToolCalls,
} from "@/lib/chat";
import { normalizeMessagePartsForStorage } from "@/lib/utils/message-parts";

export async function updateChatProjectLinkFromToolResults(
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

export function buildPersistableUserMessages(
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
        parts: normalizeMessagePartsForStorage(message.parts),
        attachments: fileAttachments,
        createdAt: new Date(),
      };
    });
}

export function buildPersistableAssistantMessage(
  chatId: string,
  message: UIMessage,
): DBMessage {
  const fileAttachments = message.parts.filter(isFilePart).map((file) => ({
    url: file.url,
    mediaType: file.mediaType,
    filename: file.filename,
  }));

  return {
    id: message.id,
    chatId,
    role: message.role,
    parts: normalizeMessagePartsForStorage(message.parts),
    attachments: fileAttachments,
    createdAt: new Date(),
  };
}

export async function persistAssistantMessage(params: {
  chatId: string;
  message: UIMessage;
}) {
  const saveResult = await saveMessages({
    messages: [buildPersistableAssistantMessage(params.chatId, params.message)],
  });

  if (!saveResult.success) {
    throw new Error(saveResult.message);
  }
}

export async function persistNewChatShell(params: {
  chatId: string;
  userId: string;
  messages: UIMessage[];
  projectId: string | null;
}) {
  const firstUserMessage = params.messages.find(
    (message) => message.role === "user",
  );
  const titleResult = firstUserMessage
    ? await generateTitleFromUserMessage({ message: firstUserMessage })
    : { success: false, data: "New Chat" };

  const title =
    titleResult.success && titleResult.data ? titleResult.data : "New Chat";

  const saveChatResult = await saveChat({
    id: params.chatId,
    title,
    userId: params.userId,
    projectId: params.projectId ?? undefined,
  });

  if (!saveChatResult.success) {
    throw new Error(saveChatResult.message);
  }
}

export async function runDeferredPersistence(params: {
  chatId: string;
  userId: string;
  messages: UIMessage[];
  projectId: string | null;
  isNewChat: boolean;
  userQuery: string;
}) {
  const { chatId, userId, messages, projectId, isNewChat, userQuery } = params;

  if (isNewChat) {
    try {
      await persistNewChatShell({
        chatId,
        userId,
        messages,
        projectId,
      });
    } catch (error) {
      console.error(
        "[Server][Deferred] Failed to save chat:",
        error instanceof Error ? error.message : String(error),
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

export async function persistAgentTelemetry(params: {
  telemetry: AgentRunTelemetry;
  toolCalls: unknown;
  toolResults: unknown;
}) {
  const { telemetry, toolCalls, toolResults } = params;

  const run = buildAgentRunRecord(telemetry);
  const toolCallRecords = buildToolCallRecords({
    runId: telemetry.runId,
    chatId: telemetry.chatId,
    toolCalls,
    toolResults,
    startedAt: telemetry.startedAt,
    finishedAt: telemetry.finishedAt,
  });

  const [runResult, toolCallsResult] = await Promise.all([
    saveAgentRun({ run }),
    saveToolCalls({ calls: toolCallRecords }),
  ]);

  if (!runResult.success) {
    throw new Error(runResult.message);
  }

  if (!toolCallsResult.success) {
    throw new Error(toolCallsResult.message);
  }
}
