import type { AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import type { UIMessage } from "ai";
import { z } from "zod";

export const validModels = ["z0-mini", "z0-pro", "z0-max"] as const;

export const chatRequestPayloadSchema = z.object({
  id: z.string().min(1),
  messages: z.array(z.custom<UIMessage>()),
  model: z.enum(validModels),
  isReasoning: z.boolean(),
  webSearchEnabled: z.boolean(),
  projectId: z.string().uuid().nullable(),
});

export type ModelName = (typeof validModels)[number];

export type ChatRequestPayload = z.infer<typeof chatRequestPayloadSchema>;

export type FilePart = {
  type: "file";
  url: string;
  mediaType: string;
  filename?: string;
};

export type AgentRunContext = {
  parentRunId?: string;
  rootRunId?: string;
  agentKind?: string;
  agentName?: string;
  metadata?: Record<string, unknown>;
};

export function parseChatRequestBody(body: unknown): ChatRequestPayload {
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
    model: (input.model as ModelName) ?? "z0-pro",
    isReasoning: input.isReasoning ?? input.enableThinking ?? false,
    webSearchEnabled: input.webSearchEnabled ?? false,
    projectId: input.projectId ?? null,
  };
}

export function validateChatRequest(payload: ChatRequestPayload) {
  return chatRequestPayloadSchema.parse(payload);
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

export function getAnthropicReasoningOptions(
  model: ModelName,
  isReasoning: boolean,
): { anthropic: AnthropicLanguageModelOptions } | undefined {
  return undefined;
}

export function buildZ0MaxErrorHint(cause: string) {
  const proModel = process.env.KIMI_PRO_MODEL ?? "kimi-k2-0905-preview";
  const maxModel = process.env.KIMI_CHAT_MODEL ?? "kimi-k2.5";
  const kimiBase = process.env.KIMI_BASE_URL ?? "(default)";

  return `${cause}. z0-max config hint: verify KIMI_BASE_URL points to a healthy OpenAI-compatible /v1 endpoint, verify KIMI_API_KEY is valid, and verify model IDs exist and are enabled on that endpoint. Current pro="${proModel}", max="${maxModel}", base="${kimiBase}".`;
}
