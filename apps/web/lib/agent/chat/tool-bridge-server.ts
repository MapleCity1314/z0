import {
  createToolBridgeErrorResponse,
  type ToolBridgeErrorResponse,
  type ToolBridgeRequestPayload,
} from "@z0/backend/agent/tool-bridge";

export async function authorizeToolBridgeTargets(params: {
  actorUserId: string;
  body: ToolBridgeRequestPayload;
  toolName: string;
  hasOwnedChat: (chatId: string, userId: string) => Promise<boolean>;
  hasOwnedProject: (projectId: string, userId: string) => Promise<boolean>;
}): Promise<ToolBridgeErrorResponse | null> {
  if (params.body.chatId) {
    const hasChatAccess = await params.hasOwnedChat(
      params.body.chatId,
      params.actorUserId,
    );

    if (!hasChatAccess) {
      return createToolBridgeErrorResponse({
        code: "forbidden:tool_bridge",
        message: "Chat not found or access denied",
        status: 403,
        toolName: params.toolName,
      });
    }
  }

  if (params.body.projectId) {
    const hasProjectAccess = await params.hasOwnedProject(
      params.body.projectId,
      params.actorUserId,
    );

    if (!hasProjectAccess) {
      return createToolBridgeErrorResponse({
        code: "forbidden:tool_bridge",
        message: "Project not found or access denied",
        status: 403,
        toolName: params.toolName,
      });
    }
  }

  return null;
}

export function resolveAgentToolForBridge(params: {
  toolName: string;
  webSearchEnabled: boolean;
  projectId: string | null;
  buildTools: (
    webSearchEnabled: boolean,
    projectId: string | null,
  ) => Record<string, { execute?: (input: unknown, context: unknown) => Promise<unknown> }>;
}) {
  const tools = params.buildTools(params.webSearchEnabled, params.projectId);
  const targetTool = tools[params.toolName];

  if (!targetTool || typeof targetTool.execute !== "function") {
    return {
      targetTool: null,
      error: createToolBridgeErrorResponse({
        code: "not_found:tool_bridge",
        message: `Unknown agent tool: ${params.toolName}`,
        status: 404,
        toolName: params.toolName,
      }),
    };
  }

  return {
    targetTool: {
      execute: targetTool.execute,
    },
    error: null,
  };
}
