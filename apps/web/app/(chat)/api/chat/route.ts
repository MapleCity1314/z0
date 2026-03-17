import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { getChatById, saveMessages } from "@/components/chat/actions";
import {
  formatMemoriesForContext,
  getRelevantMemories,
} from "@/lib/agent/memory/service";
import { getModelFromServer } from "@/lib/agent/model";
import { processAllMessageFiles } from "@/lib/agent/chat/attachments";
import {
  runDeferredPersistence,
  updateChatProjectLinkFromToolResults,
} from "@/lib/agent/chat/persistence";
import {
  addMessageMetadata,
  buildZ0MaxErrorHint,
  extractLatestUserQuery,
  getAnthropicReasoningOptions,
  parseRequestBody,
  validateRequest,
  withTimeout,
} from "@/lib/agent/chat/request";
import { buildAgentTools } from "@/lib/agent/chat/tools";
import {
  calculateCostUSD,
  calculateCreditsFromTokens,
  calculateUsageFromUIMessages,
} from "@/lib/agent/usage";
import { ChatSDKError } from "@/lib/error";
import type { DBMessage } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import {
  extractFileAttachmentsFromParts,
  normalizeStoredMessageParts,
} from "@/lib/utils/message-parts";
import { SYSTEM_PROMPT } from "./prompt";

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

    const tools = buildAgentTools(payload.webSearchEnabled, payload.projectId);
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
