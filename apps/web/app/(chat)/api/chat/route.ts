import {
  createAgentChatResponse,
  mapAgentChatError,
  parseChatRequestBody,
  validateChatRequest,
  withTimeout,
} from "@z0/backend";
import { type NextRequest, NextResponse } from "next/server";
import { getChatById, saveMessages } from "@/components/chat/actions";
import {
  formatMemoriesForContext,
  getRelevantMemories,
} from "@/lib/agent/memory/service";
import { getModelFromServer } from "@/lib/agent/model";
import { processAllMessageFiles } from "@/lib/agent/chat/attachments";
import {
  persistAgentTelemetry,
  runDeferredPersistence,
  updateChatProjectLinkFromToolResults,
} from "@/lib/agent/chat/persistence";
import { buildAgentTools } from "@/lib/agent/chat/tools";
import type { DBMessage } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import {
  extractFileAttachmentsFromParts,
  normalizeMessagePartsForStorage,
  normalizeStoredMessageParts,
} from "@/lib/utils/message-parts";

export const maxDuration = 30;

const MEMORY_TIMEOUT_MS = 1200;

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

export async function POST(request: NextRequest) {
  let requestedModel: string | undefined;

  try {
    const payload = parseChatRequestBody(await request.json());
    requestedModel = payload.model;
    validateChatRequest(payload);

    console.log("[Server] Received request", {
      chatId: payload.id,
      model: payload.model,
      isReasoning: payload.isReasoning,
      webSearchEnabled: payload.webSearchEnabled,
      projectId: payload.projectId || "none",
      messageCount: payload.messages.length,
    });

    return await createAgentChatResponse({
      payload,
      dependencies: {
        getCurrentUser,
        getChatOwnerId: async (chatId) => {
          const chatResult = await getChatById({ id: chatId });
          return chatResult.success && chatResult.data
            ? chatResult.data.userId
            : null;
        },
        processMessages: processAllMessageFiles,
        buildMemoryContext: async (userId, query) => {
          const memories = await fetchMemoriesForPrompt(userId, query);
          return formatMemoriesForContext(memories);
        },
        buildTools: buildAgentTools,
        getModel: getModelFromServer as Parameters<
          typeof createAgentChatResponse
        >[0]["dependencies"]["getModel"],
        updateChatProjectLinkFromToolResults,
        persistTelemetry: persistAgentTelemetry,
        runDeferredPersistence,
        saveAssistantMessage: async ({ chatId, responseMessage }) => {
          const normalizedParts = normalizeStoredMessageParts(
            responseMessage.parts,
          );
          const assistantMessage: DBMessage = {
            id: responseMessage.id || crypto.randomUUID(),
            chatId,
            role: "assistant",
            parts: normalizeMessagePartsForStorage(normalizedParts),
            attachments: extractFileAttachmentsFromParts(normalizedParts),
            createdAt: new Date(),
          };

          const saveResult = await saveMessages({
            messages: [assistantMessage],
          });
          if (!saveResult.success) {
            throw new Error(saveResult.message);
          }
        },
      },
    });
  } catch (error) {
    console.error("[Server] API error:", error);
    const mappedError = mapAgentChatError(error, requestedModel);
    return NextResponse.json(mappedError.body, { status: mappedError.status });
  }
}
