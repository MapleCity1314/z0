import { tool } from "ai";
import { z } from "zod";
import { createInternalAuthHeaders } from "../auth/internal";
import { getEnabledAgentToolCatalog } from "./tool-catalog";
import {
  createToolBridgeErrorResponse,
  parseToolBridgeResponse,
  type ToolBridgeErrorCode,
} from "./tool-bridge";

const passthroughInputSchema = z.object({}).passthrough();

export class RemoteToolExecutionError extends Error {
  constructor(
    public readonly code: ToolBridgeErrorCode,
    public readonly status: number,
    message: string,
    public readonly toolName: string,
    public readonly retryable = false,
  ) {
    super(message);
  }
}

function getWebBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function createRemoteAgentTools(params: {
  actor: { userId: string; role?: string | null };
  webSearchEnabled: boolean;
  projectId: string | null;
  chatId: string;
}) {
  const webBaseUrl = getWebBaseUrl();

  const entries = getEnabledAgentToolCatalog({
    webSearchEnabled: params.webSearchEnabled,
    projectId: params.projectId,
  }).map((entry) => [
    entry.name,
    tool({
      description: entry.description,
      inputSchema: passthroughInputSchema,
      execute: async (input, context) => {
        const internalHeaders = createInternalAuthHeaders({
          actor: {
            userId: params.actor.userId,
            role: params.actor.role ?? "user",
          },
          purpose: "agent-bridge",
        });
        let response: Response;

        try {
          response = await fetch(
            `${webBaseUrl}/api/agent/tools/${encodeURIComponent(entry.name)}`,
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                ...internalHeaders,
              },
              body: JSON.stringify({
                chatId: params.chatId,
                projectId: params.projectId,
                webSearchEnabled: params.webSearchEnabled,
                toolCallId: context.toolCallId,
                input,
                context: {
                  messages: context.messages,
                },
              }),
              cache: "no-store",
            },
          );
        } catch {
          throw new RemoteToolExecutionError(
            "failed:tool_bridge",
            502,
            `${entry.name} bridge request failed`,
            entry.name,
            true,
          );
        }

        const rawPayload = await response.json().catch(() =>
          createToolBridgeErrorResponse({
            code: "invalid_response:tool_bridge",
            message: `${entry.name} returned an invalid bridge response`,
            status: 502,
            retryable: true,
            toolName: entry.name,
          }),
        );

        let payload;

        try {
          payload = parseToolBridgeResponse(rawPayload);
        } catch {
          payload = createToolBridgeErrorResponse({
            code: "invalid_response:tool_bridge",
            message: `${entry.name} returned an invalid bridge response`,
            status: 502,
            retryable: true,
            toolName: entry.name,
          });
        }

        if (!response.ok || "error" in payload) {
          const errorPayload =
            "error" in payload
              ? payload.error
              : {
                  code: "failed:tool_bridge" as const,
                  message: `${entry.name} failed with ${response.status}`,
                  status: response.status,
                  retryable: response.status >= 500,
                  toolName: entry.name,
                };

          throw new RemoteToolExecutionError(
            errorPayload.code,
            errorPayload.status,
            errorPayload.message,
            errorPayload.toolName ?? entry.name,
            errorPayload.retryable ?? errorPayload.status >= 500,
          );
        }

        return payload.data;
      },
    }),
  ]);

  return Object.fromEntries(entries);
}
