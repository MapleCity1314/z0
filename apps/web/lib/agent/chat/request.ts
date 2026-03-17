import type { AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import type { UIMessage } from "ai";
import { ChatSDKError } from "@/lib/error";
import type { ModelName } from "@/lib/agent/model";

export const VALID_MODELS: ModelName[] = ["z0-mini", "z0-pro", "z0-max"];

export type ChatRequestPayload = {
  id: string;
  messages: UIMessage[];
  model: ModelName;
  isReasoning: boolean;
  webSearchEnabled: boolean;
  projectId: string | null;
};

export type FilePart = {
  type: "file";
  url: string;
  mediaType: string;
  filename?: string;
};

export type FileReadResult = {
  url: string;
  filename: string;
  mediaType: string;
  isImage: boolean;
  success: boolean;
  content: string;
  error?: string;
};

export type AgentRunContext = {
  parentRunId?: string;
  rootRunId?: string;
  agentKind?: string;
  agentName?: string;
  metadata?: Record<string, unknown>;
};

export function parseRequestBody(body: unknown): ChatRequestPayload {
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

export function validateRequest(payload: ChatRequestPayload) {
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

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
) {
  return Promise.race<T>([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

export function extractLatestUserQuery(messages: UIMessage[]): string {
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

export function extractLatestAgentRunContext(
  messages: UIMessage[],
): AgentRunContext | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "user") continue;

    const metadata =
      typeof message.metadata === "object" && message.metadata !== null
        ? (message.metadata as Record<string, unknown>)
        : null;
    const context =
      metadata &&
      typeof metadata.agentContext === "object" &&
      metadata.agentContext !== null &&
      !Array.isArray(metadata.agentContext)
        ? (metadata.agentContext as Record<string, unknown>)
        : null;

    if (!context) {
      return null;
    }

    return {
      parentRunId:
        typeof context.parentRunId === "string"
          ? context.parentRunId
          : undefined,
      rootRunId:
        typeof context.rootRunId === "string" ? context.rootRunId : undefined,
      agentKind:
        typeof context.agentKind === "string" ? context.agentKind : undefined,
      agentName:
        typeof context.agentName === "string" ? context.agentName : undefined,
      metadata:
        typeof context.metadata === "object" &&
        context.metadata !== null &&
        !Array.isArray(context.metadata)
          ? (context.metadata as Record<string, unknown>)
          : undefined,
    };
  }

  return null;
}

export function getAnthropicReasoningOptions(
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

export function addMessageMetadata(
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

export function isFilePart(part: unknown): part is FilePart {
  const maybe = part as Partial<FilePart>;
  return (
    !!maybe &&
    maybe.type === "file" &&
    typeof maybe.url === "string" &&
    typeof maybe.mediaType === "string"
  );
}

export function buildZ0MaxErrorHint(cause: string) {
  const sonnetModel = process.env.CLAUDE_SONNET_MODEL ?? "claude-sonnet-4-6";
  const opusModel = process.env.CLAUDE_OPUS_MODEL ?? "claude-opus-4-6";
  const anthropicBase =
    process.env.ANTHROPIC_BASE_URL ??
    process.env.CLAUDE_BASE_URL ??
    "(default)";

  return `${cause}. z0-max config hint: verify ANTHROPIC_BASE_URL points to a healthy Anthropic-compatible /v1 endpoint, and verify model IDs exist and are enabled on that endpoint. Current sonnet="${sonnetModel}", opus="${opusModel}", base="${anthropicBase}".`;
}
