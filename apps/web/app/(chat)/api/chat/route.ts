import {
  mapAgentChatError,
  parseChatRequestBody,
  validateChatRequest,
  withTimeout,
} from "@z0/backend";
import { type NextRequest, NextResponse } from "next/server";
import { getChatById } from "@/components/chat/actions";
import {
  formatMemoriesForContext,
  getRelevantMemories,
} from "@/lib/agent/memory/service";
import { processAllMessageFiles } from "@/lib/agent/chat/attachments";
import {
  runDeferredPersistence,
} from "@/lib/agent/chat/persistence";
import { getCurrentUser } from "@/lib/session";

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

    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { code: "unauthorized:chat", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const processedMessages = await processAllMessageFiles(payload.messages);
    const userQuery = [...payload.messages]
      .reverse()
      .find((message) => message.role === "user")
      ?.parts.filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim() ?? "";
    const memoryContext = formatMemoriesForContext(
      await fetchMemoriesForPrompt(user.id, userQuery),
    );

    const chatResult = await getChatById({ id: payload.id });
    const isNewChat = !chatResult.success || !chatResult.data;

    runDeferredPersistence({
      chatId: payload.id,
      userId: user.id,
      messages: processedMessages,
      projectId: payload.projectId,
      isNewChat,
      userQuery,
    }).catch(() => undefined);

    const response = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:3001"}/v1/agent/chat`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-id": user.id,
          ...(user.role ? { "x-user-role": user.role } : {}),
        },
        body: JSON.stringify({
          ...payload,
          messages: processedMessages,
          memoryContext,
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const errorPayload = await response.json();
      return NextResponse.json(errorPayload, { status: response.status });
    }

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error("[Server] API error:", error);
    const mappedError = mapAgentChatError(error, requestedModel);
    return NextResponse.json(mappedError.body, { status: mappedError.status });
  }
}
