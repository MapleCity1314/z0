import {
  buildAgentRunRecord,
  buildToolCallRecords,
  createAgentChatResponse,
  createRemoteAgentTools,
  discoverAgentSkills,
  extractFileAttachmentsFromParts,
  getConfiguredSkillDirectories,
  getChatById,
  getModelFromServer,
  mapAgentChatError,
  normalizeMessagePartsForStorage,
  parseChatRequestBody,
  saveAgentRun,
  saveMessages,
  saveToolCalls,
  updateChatProjectLinkFromToolResults,
  validateChatRequest,
  type AgentRunTelemetry,
} from "@z0/backend";
import type { Hono } from "hono";
import { requireActor } from "../actor";

export function registerAgentRoutes(app: Hono) {
  app.post("/v1/agent/chat", async (c) => {
    const actor = await requireActor(c);
    let requestedModel: string | undefined;

    try {
      const rawBody = (await c.req.json()) as Record<string, unknown>;
      const payload = parseChatRequestBody(rawBody);
      requestedModel = payload.model;
      validateChatRequest(payload);

      const memoryContext =
        typeof rawBody.memoryContext === "string" ? rawBody.memoryContext : "";

      const response = await createAgentChatResponse({
        payload,
        dependencies: {
          getCurrentUser: async () => ({ id: actor.userId }),
          getChatOwnerId: async (chatId) => {
            const chat = await getChatById(chatId);
            return chat?.userId ?? null;
          },
          processMessages: async (messages) => messages,
          buildMemoryContext: async () => memoryContext,
          getAvailableSkills: async ({ userId, chatId }) => {
            const configuredSkillDirectories =
              await getConfiguredSkillDirectories({
                userId,
                chatId,
              });

            return discoverAgentSkills({
              configuredSkillDirectories,
            });
          },
          buildTools: () =>
            createRemoteAgentTools({
              actor: { userId: actor.userId, role: actor.role },
              webSearchEnabled: payload.webSearchEnabled,
              projectId: payload.projectId,
              chatId: payload.id,
            }),
          getModel: getModelFromServer,
          updateChatProjectLinkFromToolResults,
          persistTelemetry: async ({ telemetry, toolCalls, toolResults }) => {
            await persistAgentTelemetry({ telemetry, toolCalls, toolResults });
          },
          runDeferredPersistence: async () => undefined,
          saveAssistantMessage: async ({ chatId, responseMessage }) => {
            const assistantMessage = {
              id: responseMessage.id || crypto.randomUUID(),
              chatId,
              role: "assistant",
              parts: normalizeMessagePartsForStorage(responseMessage.parts),
              attachments: extractFileAttachmentsFromParts(responseMessage.parts),
              createdAt: new Date(),
            };

            await saveMessages([assistantMessage]);
          },
        },
      });

      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      });
    } catch (error) {
      const mappedError = mapAgentChatError(error, requestedModel);
      return c.json(mappedError.body, mappedError.status as 400);
    }
  });
}

async function persistAgentTelemetry(params: {
  telemetry: AgentRunTelemetry;
  toolCalls: unknown;
  toolResults: unknown;
}) {
  const run = buildAgentRunRecord(params.telemetry);
  const toolCallRecords = buildToolCallRecords({
    runId: params.telemetry.runId,
    chatId: params.telemetry.chatId,
    toolCalls: params.toolCalls,
    toolResults: params.toolResults,
    startedAt: params.telemetry.startedAt,
    finishedAt: params.telemetry.finishedAt,
  });

  await Promise.all([saveAgentRun(run), saveToolCalls(toolCallRecords)]);
}
