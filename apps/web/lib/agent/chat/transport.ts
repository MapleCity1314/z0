import {
  extractLatestUserQuery,
  type ChatRequestPayload,
  withTimeout,
} from "@z0/backend/agent/request";
import { createInternalAuthHeaders } from "@z0/backend/auth";
import type { UIMessage } from "ai";
import type { MemoryItem } from "@/lib/agent/memory/service";

const MEMORY_TIMEOUT_MS = 1200;

type PreparedChatForwardRequest = {
  apiUrl: string;
  apiHeaders: HeadersInit;
  apiBody: ChatRequestPayload & {
    messages: UIMessage[];
    memoryContext: string;
  };
  persistence: {
    chatId: string;
    userId: string;
    messages: UIMessage[];
    projectId: string | null;
    isNewChat: boolean;
    userQuery: string;
  };
};

function maskHeaderValue(value: string) {
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function summarizeHeaders(headers: HeadersInit) {
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

export function logResponsePreview(
  stream: ReadableStream<Uint8Array> | null,
  _label: string,
) {
  return stream;
}

async function fetchMemoriesForPrompt(params: {
  userId: string;
  userQuery: string;
  getRelevantMemories: (
    userId: string,
    query: string | undefined,
    limit: number,
  ) => Promise<MemoryItem[]>;
  formatMemoriesForContext: (memories: MemoryItem[]) => string;
}) {
  try {
    const memoryPromise =
      params.userQuery.trim().length > 3
        ? params.getRelevantMemories(params.userId, params.userQuery, 5)
        : params.getRelevantMemories(params.userId, undefined, 5);

    const memories = await withTimeout(memoryPromise, MEMORY_TIMEOUT_MS, []);
    return params.formatMemoriesForContext(memories);
  } catch (error) {
    console.warn(
      "[Server] Memory fetch failed, continuing without memory:",
      error,
    );
    return "";
  }
}

export async function prepareChatForwardRequest(params: {
  payload: ChatRequestPayload;
  user: { id: string; role?: string | null };
  cookieHeader: string | null;
  processMessages: (messages: UIMessage[]) => Promise<UIMessage[]>;
  getChatById: (params: { id: string }) => Promise<{
    success: boolean;
    data?: unknown;
  }>;
  getRelevantMemories: (
    userId: string,
    query: string | undefined,
    limit: number,
  ) => Promise<MemoryItem[]>;
  formatMemoriesForContext: (memories: MemoryItem[]) => string;
}): Promise<PreparedChatForwardRequest> {
  const userQuery = extractLatestUserQuery(params.payload.messages).trim();

  const [processedMessages, memoryContext, chatResult] = await Promise.all([
    params.processMessages(params.payload.messages),
    fetchMemoriesForPrompt({
      userId: params.user.id,
      userQuery,
      getRelevantMemories: params.getRelevantMemories,
      formatMemoriesForContext: params.formatMemoriesForContext,
    }),
    params.getChatById({ id: params.payload.id }),
  ]);

  const apiUrl = `${process.env.API_BASE_URL ?? "http://localhost:3001"}/v1/agent/chat`;
  const apiHeaders = {
    "content-type": "application/json",
    ...createInternalAuthHeaders({
      actor: {
        userId: params.user.id,
        role: params.user.role ?? "user",
      },
      purpose: "web-api",
    }),
    ...(params.cookieHeader ? { cookie: params.cookieHeader } : {}),
  };

  return {
    apiUrl,
    apiHeaders,
    apiBody: {
      ...params.payload,
      messages: processedMessages,
      memoryContext,
    },
    persistence: {
      chatId: params.payload.id,
      userId: params.user.id,
      messages: processedMessages,
      projectId: params.payload.projectId,
      isNewChat: !chatResult.success || !chatResult.data,
      userQuery,
    },
  };
}

export async function readForwardedChatError(response: Response) {
  const fallbackCause =
    response.statusText.trim().length > 0
      ? `Agent API returned ${response.status} ${response.statusText}`
      : `Agent API returned ${response.status}`;

  try {
    const payload = await response.json();

    if (
      typeof payload === "object" &&
      payload !== null &&
      typeof (payload as { code?: unknown }).code === "string" &&
      typeof (payload as { message?: unknown }).message === "string"
    ) {
      return payload;
    }
  } catch (error) {
    console.warn("[Server] API chat error payload was not valid JSON", {
      status: response.status,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    code: "bad_request:api",
    message: "Failed to process chat request",
    cause: fallbackCause,
  };
}
