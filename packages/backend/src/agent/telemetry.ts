import type { AgentRun, ToolCall } from "@z0/db";

export type AgentRunTelemetry = {
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
