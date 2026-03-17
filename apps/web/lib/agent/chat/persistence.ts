import type { UIMessage } from "ai";
import type { DBMessage } from "@/lib/schema";
import { extractMemoriesFromMessage } from "@/lib/agent/memory/service";
import {
  generateTitleFromUserMessage,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from "@/components/chat/actions";
import { isFilePart } from "@/lib/agent/chat/request";

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
        parts: message.parts,
        attachments: fileAttachments,
        createdAt: new Date(),
      };
    });
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
