import {
  buildAgentRunRecord,
  buildToolCallRecords,
  createAgentChatResponse,
  createRemoteAgentTools,
  discoverAgentSkills,
  extractFileAttachmentsFromParts,
  getAgentCapabilityBoundarySnapshot,
  getConfiguredMcpServers,
  getOrCreatePooledMcpToolRuntime,
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
import type { AgentCapabilityBoundarySnapshot } from "@z0/shared-types";
import type { Hono } from "hono";
import { requireActor } from "../actor";

export function registerAgentRoutes(app: Hono) {
  app.get("/v1/agent/capabilities", async (c) => {
    await requireActor(c);

    const snapshot: AgentCapabilityBoundarySnapshot =
      getAgentCapabilityBoundarySnapshot();
    return c.json({ data: snapshot });
  });

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
          buildTools: async () => {
            const remoteTools = createRemoteAgentTools({
              actor: { userId: actor.userId, role: actor.role },
              webSearchEnabled: payload.webSearchEnabled,
              projectId: payload.projectId,
              chatId: payload.id,
            });
            const mcpServers = await getConfiguredMcpServers({
              userId: actor.userId,
              chatId: payload.id,
            });
            const mcpRuntime = await getOrCreatePooledMcpToolRuntime({
              chatId: payload.id,
              servers: mcpServers,
              reservedToolNames: Object.keys(remoteTools),
            });

            console.log("[Agent API] Built tool runtime", {
              userId: actor.userId,
              chatId: payload.id,
              remoteToolCount: Object.keys(remoteTools).length,
              remoteToolNames: Object.keys(remoteTools),
              mcpServerCount: mcpServers.length,
              mcpServers: mcpServers.map((server) => ({
                id: server.id,
                name: server.name,
                sourceType: server.sourceType,
              })),
              mcpToolCount: mcpRuntime.mcpTools.length,
              mcpTools: mcpRuntime.mcpTools.map((tool) => ({
                name: tool.name,
                serverName: tool.serverName,
                originalName: tool.originalName,
              })),
              mcpStatuses: mcpRuntime.serverStatuses.map((status) => ({
                id: status.id,
                name: status.name,
                sourceType: status.sourceType,
                availability: status.availability,
                toolCount: status.toolCount,
                retryable: status.retryable,
              })),
            });

            return {
              tools: {
                ...remoteTools,
                ...mcpRuntime.tools,
              },
              mcpTools: mcpRuntime.mcpTools,
              close: mcpRuntime.close,
            };
          },
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
