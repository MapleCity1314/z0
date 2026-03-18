import { tool } from "ai";
import { z } from "zod";
import { createInternalAuthHeaders } from "../auth/internal";
import { getEnabledAgentToolCatalog } from "./tool-catalog";
import {
  createToolBridgeErrorResponse,
  parseToolBridgeResponse,
} from "./tool-bridge";

const passthroughInputSchema = z.object({}).passthrough();

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
        const response = await fetch(
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

        const payload = parseToolBridgeResponse(
          await response.json().catch(() =>
            createToolBridgeErrorResponse(
              `${entry.name} returned an invalid bridge response`,
            ),
          ),
        );

        if (!response.ok || "error" in payload) {
          throw new Error(
            ("error" in payload ? payload.error.message : undefined) ??
              `${entry.name} failed with ${response.status}`,
          );
        }

        return payload.data;
      },
    }),
  ]);

  return Object.fromEntries(entries);
}
