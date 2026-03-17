import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import {
  addMessageMetadata,
  extractLatestAgentRunContext,
  extractLatestUserQuery,
  getAnthropicReasoningOptions,
  buildZ0MaxErrorHint,
} from "./request";
import { buildChatSystemPrompt } from "./prompt";
import {
  calculateCostUSD,
  calculateCreditsFromTokens,
  calculateUsageFromUIMessages,
} from "./usage";
import type { ChatRequestPayload, ModelName } from "./request";
import { createSkillTools, type AgentSkillMetadata } from "./skills";

export class AgentChatOrchestrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export type AgentChatDependencies = {
  getCurrentUser: () => Promise<{ id: string } | null>;
  getChatOwnerId: (chatId: string) => Promise<string | null>;
  processMessages: (messages: UIMessage[]) => Promise<UIMessage[]>;
  buildMemoryContext: (userId: string, query: string) => Promise<string>;
  getAvailableSkills: (params: {
    userId: string;
    chatId: string;
  }) => Promise<AgentSkillMetadata[]>;
  buildTools: (
    webSearchEnabled: boolean,
    projectId: string | null,
  ) => NonNullable<Parameters<typeof streamText>[0]["tools"]>;
  getModel: (
    model: ModelName,
    options: { isReasoning: boolean },
  ) => Parameters<typeof streamText>[0]["model"];
  updateChatProjectLinkFromToolResults: (
    chatId: string,
    toolResults: unknown,
  ) => Promise<void>;
  persistTelemetry: (params: {
    telemetry: {
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
    toolCalls: unknown;
    toolResults: unknown;
  }) => Promise<void>;
  runDeferredPersistence: (params: {
    chatId: string;
    userId: string;
    messages: UIMessage[];
    projectId: string | null;
    isNewChat: boolean;
    userQuery: string;
  }) => Promise<void>;
  saveAssistantMessage: (params: {
    chatId: string;
    responseMessage: UIMessage;
  }) => Promise<void>;
};

export async function createAgentChatResponse(params: {
  payload: ChatRequestPayload;
  dependencies: AgentChatDependencies;
}) {
  const { payload, dependencies } = params;
  const runStartedAt = new Date();
  const runId = crypto.randomUUID();

  const userPromise = dependencies.getCurrentUser();
  const chatOwnerPromise = dependencies.getChatOwnerId(payload.id);
  const processedMessagesPromise = dependencies.processMessages(
    payload.messages,
  );

  const [user, chatOwnerId] = await Promise.all([
    userPromise,
    chatOwnerPromise,
  ]);

  if (!user?.id) {
    throw new AgentChatOrchestrationError(
      "unauthorized:chat",
      "Unauthorized",
      401,
    );
  }

  const isNewChat = !chatOwnerId;
  if (chatOwnerId && chatOwnerId !== user.id) {
    throw new AgentChatOrchestrationError("forbidden:chat", "Forbidden", 403);
  }

  const userQuery = extractLatestUserQuery(payload.messages);
  const runContext = extractLatestAgentRunContext(payload.messages);
  const triggerMessageId = [...payload.messages]
    .reverse()
    .find((message: UIMessage) => message.role === "user")?.id;

  const [processedMessages, memoryContext] = await Promise.all([
    processedMessagesPromise,
    dependencies.buildMemoryContext(user.id, userQuery),
  ]);
  const availableSkills = await dependencies.getAvailableSkills({
    userId: user.id,
    chatId: payload.id,
  });

  const allMessages = addMessageMetadata(
    processedMessages,
    payload.id,
    payload.projectId,
    user.id,
  );

  const modelMessages = await convertToModelMessages(allMessages);
  const tools = {
    ...dependencies.buildTools(payload.webSearchEnabled, payload.projectId),
    ...createSkillTools(availableSkills),
  };
  const providerOptions = getAnthropicReasoningOptions(
    payload.model,
    payload.isReasoning,
  );

  const result = streamText({
    model: dependencies.getModel(payload.model, {
      isReasoning: payload.isReasoning,
    }),
    system: buildChatSystemPrompt({
      webSearchEnabled: payload.webSearchEnabled,
      projectId: payload.projectId,
      memoryContext,
      skills: availableSkills,
    }),
    messages: modelMessages,
    providerOptions,
    temperature: 0.7,
    stopWhen: stepCountIs(20),
    tools,
    toolChoice: "auto",
    onFinish: async ({ finishReason, toolCalls, toolResults }) => {
      await dependencies.updateChatProjectLinkFromToolResults(
        payload.id,
        toolResults,
      );

      const aiUsage = calculateUsageFromUIMessages(allMessages);
      const credits = calculateCreditsFromTokens(
        aiUsage.promptTokens,
        aiUsage.completionTokens,
      );
      const costUSD = calculateCostUSD(aiUsage);

      await dependencies.persistTelemetry({
        telemetry: {
          runId,
          chatId: payload.id,
          userId: user.id,
          projectId: payload.projectId,
          parentRunId: runContext?.parentRunId,
          rootRunId: runContext?.rootRunId,
          triggerMessageId,
          model: payload.model,
          agentKind: runContext?.agentKind,
          agentName: runContext?.agentName,
          isReasoning: payload.isReasoning,
          webSearchEnabled: payload.webSearchEnabled,
          messageCount: payload.messages.length,
          status: "completed",
          finishReason,
          promptTokens: aiUsage.promptTokens,
          completionTokens: aiUsage.completionTokens,
          totalTokens: aiUsage.totalTokens,
          credits,
          cost: costUSD.totalUSD,
          startedAt: runStartedAt,
          finishedAt: new Date(),
          metadata: {
            ...(runContext?.metadata ?? {}),
            toolCallCount: toolCalls?.length ?? 0,
            toolResultCount: Array.isArray(toolResults)
              ? toolResults.length
              : 0,
          },
        },
        toolCalls,
        toolResults,
      });
    },
    onError: (error) => {
      const now = new Date();
      dependencies
        .persistTelemetry({
          telemetry: {
            runId,
            chatId: payload.id,
            userId: user.id,
            projectId: payload.projectId,
            parentRunId: runContext?.parentRunId,
            rootRunId: runContext?.rootRunId,
            triggerMessageId,
            model: payload.model,
            agentKind: runContext?.agentKind,
            agentName: runContext?.agentName,
            isReasoning: payload.isReasoning,
            webSearchEnabled: payload.webSearchEnabled,
            messageCount: payload.messages.length,
            status: "failed",
            finishReason:
              error instanceof Error ? error.message.slice(0, 64) : "error",
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            credits: 0,
            cost: 0,
            startedAt: runStartedAt,
            finishedAt: now,
            metadata: {
              ...(runContext?.metadata ?? {}),
              error: error instanceof Error ? error.message : String(error),
            },
          },
          toolCalls: [],
          toolResults: [],
        })
        .catch(() => undefined);
    },
  });

  dependencies
    .runDeferredPersistence({
      chatId: payload.id,
      userId: user.id,
      messages: payload.messages,
      projectId: payload.projectId,
      isNewChat,
      userQuery,
    })
    .catch(() => undefined);

  return result.toUIMessageStreamResponse({
    originalMessages: allMessages,
    generateMessageId: () => crypto.randomUUID(),
    sendReasoning: true,
    sendSources: true,
    onFinish: async ({ responseMessage }) => {
      if (responseMessage.role !== "assistant") {
        return;
      }

      await dependencies.saveAssistantMessage({
        chatId: payload.id,
        responseMessage,
      });
    },
  });
}

export function mapAgentChatError(error: unknown, requestedModel?: string) {
  if (error instanceof AgentChatOrchestrationError) {
    return {
      status: error.status,
      body: {
        code: error.code,
        message: error.message,
      },
    };
  }

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

  return {
    status: 500,
    body: {
      code: "bad_request:api",
      message: "Failed to process chat request",
      cause,
    },
  };
}
