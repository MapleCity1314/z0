import {
  createInternalAuthHeaders,
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

function maskHeaderValue(value: string) {
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function summarizeHeaders(headers: HeadersInit) {
  return Object.fromEntries(
    Array.from(new Headers(headers).entries()).map(([key, value]) => [
      key,
      key === "authorization" ||
      key === "x-api-key" ||
      key === "x-internal-auth-sig"
        ? maskHeaderValue(value)
        : value,
    ]),
  );
}

function logResponsePreview(
  stream: ReadableStream<Uint8Array> | null,
  label: string,
) {
  if (!stream) {
    return stream;
  }

  const [previewStream, passthroughStream] = stream.tee();

  void (async () => {
    const reader = previewStream.getReader();
    const decoder = new TextDecoder();
    let preview = "";

    try {
      while (preview.length < 1200) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        preview += decoder.decode(value, { stream: true });
      }
    } catch (error) {
      console.error(`${label} preview failed`, error);
      return;
    } finally {
      reader.releaseLock();
    }

    console.log(label, preview.slice(0, 1200));
  })();

  return passthroughStream;
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

    const apiUrl = `${process.env.API_BASE_URL ?? "http://localhost:3001"}/v1/agent/chat`;
    const apiHeaders = {
      "content-type": "application/json",
      ...createInternalAuthHeaders({
        actor: {
          userId: user.id,
          role: user.role,
        },
        purpose: "web-api",
      }),
      ...(request.headers.get("cookie")
        ? { cookie: request.headers.get("cookie") as string }
        : {}),
    };

    console.log("[Server] Forwarding chat request to API", {
      apiUrl,
      headers: summarizeHeaders(apiHeaders),
      model: payload.model,
      webSearchEnabled: payload.webSearchEnabled,
      isReasoning: payload.isReasoning,
    });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify({
        ...payload,
        messages: processedMessages,
        memoryContext,
      }),
      cache: "no-store",
    });

    console.log("[Server] API chat response received", {
      status: response.status,
      statusText: response.statusText,
      headers: summarizeHeaders(response.headers),
    });

    if (!response.ok) {
      const errorPayload = await response.json();
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
