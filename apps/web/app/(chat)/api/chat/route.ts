import {
  parseChatRequestBody,
  validateChatRequest,
} from "@z0/backend/agent/request";
import { mapAgentChatError } from "@z0/backend/agent/chat-errors";
import { type NextRequest, NextResponse } from "next/server";
import { getChatById } from "@/components/chat/actions";
import {
  formatMemoriesForContext,
  getRelevantMemories,
} from "@/lib/agent/memory/service";
import { processAllMessageFiles } from "@/lib/agent/chat/attachments";
import { runDeferredPersistence } from "@/lib/agent/chat/persistence";
import {
  logResponsePreview,
  prepareChatForwardRequest,
  readForwardedChatError,
  summarizeHeaders,
} from "@/lib/agent/chat/transport";
import { getCurrentUser } from "@/lib/session";

export const maxDuration = 30;

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

    const forwardedRequest = await prepareChatForwardRequest({
      payload,
      user,
      cookieHeader: request.headers.get("cookie"),
      processMessages: processAllMessageFiles,
      getChatById,
      getRelevantMemories,
      formatMemoriesForContext,
    });

    runDeferredPersistence(forwardedRequest.persistence).catch(() => undefined);

    console.log("[Server] Forwarding chat request to API", {
      apiUrl: forwardedRequest.apiUrl,
      headers: summarizeHeaders(forwardedRequest.apiHeaders),
      model: payload.model,
      webSearchEnabled: payload.webSearchEnabled,
      isReasoning: payload.isReasoning,
    });

    const response = await fetch(forwardedRequest.apiUrl, {
      method: "POST",
      headers: forwardedRequest.apiHeaders,
      body: JSON.stringify(forwardedRequest.apiBody),
      cache: "no-store",
    });

    console.log("[Server] API chat response received", {
      status: response.status,
      statusText: response.statusText,
      headers: summarizeHeaders(response.headers),
    });

    if (!response.ok) {
      const errorPayload = await readForwardedChatError(response);
      return NextResponse.json(errorPayload, { status: response.status });
    }

    return new Response(
      logResponsePreview(response.body, "[Server] API chat response preview"),
      {
      status: response.status,
      headers: response.headers,
      },
    );
  } catch (error) {
    console.error("[Server] API error:", error);
    const mappedError = mapAgentChatError(error, requestedModel);
    return NextResponse.json(mappedError.body, { status: mappedError.status });
  }
}
