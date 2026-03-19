import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import {
  createToolBridgeErrorResponse,
  createToolBridgeSuccessResponse,
  normalizeToolBridgeExecutionError,
  parseToolBridgeRequestBody,
  verifyInternalAuthHeaders,
} from "@z0/backend";
import { buildAgentTools } from "@/lib/agent/chat/tools";
import {
  authorizeToolBridgeTargets,
  resolveAgentToolForBridge,
} from "@/lib/agent/chat/tool-bridge-server";
import { db } from "@/lib/db";
import { chat, project } from "@/lib/schema";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolName: string }> },
) {
  const actor = verifyInternalAuthHeaders(request.headers, "agent-bridge");

  if (!actor) {
    return NextResponse.json(
      createToolBridgeErrorResponse({
        code: "forbidden:tool_bridge",
        message: "Forbidden",
        status: 403,
      }),
      { status: 403 },
    );
  }

  const { toolName } = await context.params;
  let body: ReturnType<typeof parseToolBridgeRequestBody>;

  try {
    body = parseToolBridgeRequestBody(await request.json());
  } catch (error) {
    const message =
      error instanceof ZodError
        ? "Invalid tool bridge request payload"
        : error instanceof Error
          ? error.message
          : "Invalid tool bridge request payload";

    return NextResponse.json(
      createToolBridgeErrorResponse({
        code: "bad_request:tool_bridge",
        message,
        status: 400,
        toolName,
      }),
      { status: 400 },
    );
  }

  const accessError = await authorizeToolBridgeTargets({
    actorUserId: actor.userId,
    body,
    toolName,
    hasOwnedChat: async (chatId, userId) => {
      const [chatRecord] = await db
        .select({ id: chat.id })
        .from(chat)
        .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
        .limit(1);

      return Boolean(chatRecord);
    },
    hasOwnedProject: async (projectId, userId) => {
      const [projectRecord] = await db
        .select({ id: project.id })
        .from(project)
        .where(and(eq(project.id, projectId), eq(project.userId, userId)))
        .limit(1);

      return Boolean(projectRecord);
    },
  });

  if (accessError) {
    return NextResponse.json(accessError, {
      status: accessError.error.status,
    });
  }

  const { targetTool, error: toolLookupError } = resolveAgentToolForBridge({
    toolName,
    webSearchEnabled: body.webSearchEnabled,
    projectId: body.projectId ?? null,
    buildTools: (webSearchEnabled, projectId) =>
      buildAgentTools(webSearchEnabled, projectId) as Record<
        string,
        { execute?: (input: unknown, context: unknown) => Promise<unknown> }
      >,
  });

  if (toolLookupError) {
    return NextResponse.json(toolLookupError, {
      status: toolLookupError.error.status,
    });
  }

  const executeTool = targetTool.execute;

  try {
    const data = await executeTool(body.input ?? {}, {
      toolCallId: body.toolCallId,
      messages: {
        chatId: body.chatId,
        projectId: body.projectId ?? null,
      },
    });

    return NextResponse.json(createToolBridgeSuccessResponse(data));
  } catch (error) {
    console.error("[AgentTool] Execution failed", {
      toolName,
      chatId: body.chatId ?? null,
      projectId: body.projectId ?? null,
      message: error instanceof Error ? error.message : String(error),
    });

    const errorResponse = normalizeToolBridgeExecutionError({
      error,
      toolName,
      fallbackMessage: "Tool execution failed",
    });

    return NextResponse.json(errorResponse, {
      status: errorResponse.error.status,
    });
  }
}
