import type { UIMessage } from "ai";
import type { AgentRun, DBMessage, ToolCall } from "@/lib/schema";
import { extractMemoriesFromMessage } from "@/lib/agent/memory/service";
import {
  generateTitleFromUserMessage,
  getMessagesByChatId,
  saveAgentRun,
  saveChat,
  saveMessages,
  saveToolCalls,
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

type AgentRunTelemetry = {
  runId: string;
  chatId: string;
  userId: string;
  projectId: string | null;
  parentRunId?: string;
  rootRunId?: string;
  triggerMessageId?: string;
  model: string;
  agentKind?: string;
  agentName?: string;
  isReasoning: boolean;
  webSearchEnabled: boolean;
  messageCount: number;
  status: "completed" | "failed";
  finishReason?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  credits: number;
  cost: number;
  startedAt: Date;
  finishedAt: Date;
  metadata?: Record<string, unknown>;
};

type ToolCallLike = {
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
};

type ToolResultLike = {
  toolCallId?: string;
  toolName?: string;
  result?: unknown;
  output?: unknown;
  errorText?: string;
  state?: string;
};

function asObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toTextValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function buildAgentRunRecord(telemetry: AgentRunTelemetry): Omit<
  AgentRun,
  "createdAt" | "updatedAt"
> & {
  createdAt?: Date;
  updatedAt?: Date;
} {
  return {
    id: telemetry.runId,
    chatId: telemetry.chatId,
    userId: telemetry.userId,
    projectId: telemetry.projectId,
    parentRunId: telemetry.parentRunId ?? null,
    rootRunId: telemetry.rootRunId ?? telemetry.parentRunId ?? telemetry.runId,
    triggerMessageId: telemetry.triggerMessageId ?? null,
    agentKind: telemetry.agentKind ?? "chat",
    agentName: telemetry.agentName ?? "primary-chat",
    model: telemetry.model,
    status: telemetry.status,
    finishReason: telemetry.finishReason ?? null,
    webSearchEnabled: telemetry.webSearchEnabled,
    isReasoning: telemetry.isReasoning,
    messageCount: telemetry.messageCount,
    promptTokens: telemetry.promptTokens,
    completionTokens: telemetry.completionTokens,
    totalTokens: telemetry.totalTokens,
    credits: telemetry.credits,
    cost: telemetry.cost.toFixed(6),
    metadata: telemetry.metadata ?? {},
    startedAt: telemetry.startedAt,
    finishedAt: telemetry.finishedAt,
  };
}

export function buildToolCallRecords(params: {
  runId: string;
  chatId: string;
  toolCalls: unknown;
  toolResults: unknown;
  startedAt: Date;
  finishedAt: Date;
}): ToolCall[] {
  const { runId, chatId, toolCalls, toolResults, startedAt, finishedAt } =
    params;

  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return [];
  }

  const resultsByToolCallId = new Map<string, ToolResultLike>();
  if (Array.isArray(toolResults)) {
    for (const result of toolResults) {
      const record = asObjectRecord(result) as ToolResultLike | null;
      const toolCallId = toTextValue(record?.toolCallId);
      if (!toolCallId) continue;
      resultsByToolCallId.set(toolCallId, record ?? {});
    }
  }

  return toolCalls.flatMap((call) => {
    const record = asObjectRecord(call) as ToolCallLike | null;
    const toolCallId = toTextValue(record?.toolCallId);
    const toolName = toTextValue(record?.toolName);
    if (!toolCallId || !toolName) {
      return [];
    }

    const result = resultsByToolCallId.get(toolCallId);
    const resultPayload = result
      ? (result.result ?? result.output ?? null)
      : null;
    const state = result?.errorText
      ? "output-error"
      : result
        ? "output-available"
        : "input-available";
    const now = new Date();

    return [
      {
        id: crypto.randomUUID(),
        runId,
        chatId,
        messageId: null,
        toolCallId,
        toolName,
        state,
        input: record?.input ?? null,
        output: resultPayload,
        errorText: result?.errorText ?? null,
        metadata: result
          ? {
              resultState: result.state ?? state,
            }
          : {},
        startedAt,
        finishedAt: state === "input-available" ? null : finishedAt,
        createdAt: now,
        updatedAt: now,
      },
    ];
  });
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
