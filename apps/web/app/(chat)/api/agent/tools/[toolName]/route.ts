import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import {
  createToolBridgeErrorResponse,
  createToolBridgeSuccessResponse,
  parseToolBridgeRequestBody,
  verifyInternalAuthHeaders,
} from "@z0/backend";
import { buildAgentTools } from "@/lib/agent/chat/tools";
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
  let body;

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

  if (body.chatId) {
    const [chatRecord] = await db
      .select({ id: chat.id })
      .from(chat)
      .where(and(eq(chat.id, body.chatId), eq(chat.userId, actor.userId)))
      .limit(1);

    if (!chatRecord) {
      return NextResponse.json(
        createToolBridgeErrorResponse({
          code: "forbidden:tool_bridge",
          message: "Chat not found or access denied",
          status: 403,
          toolName,
        }),
        { status: 403 },
      );
    }
  }

  if (body.projectId) {
    const [projectRecord] = await db
      .select({ id: project.id })
      .from(project)
      .where(
        and(eq(project.id, body.projectId), eq(project.userId, actor.userId)),
      )
      .limit(1);

    if (!projectRecord) {
      return NextResponse.json(
        createToolBridgeErrorResponse({
          code: "forbidden:tool_bridge",
          message: "Project not found or access denied",
          status: 403,
          toolName,
        }),
        { status: 403 },
      );
    }
  }

  const tools = buildAgentTools(
    body.webSearchEnabled ?? false,
    body.projectId ?? null,
  ) as Record<
    string,
    { execute?: (input: unknown, context: unknown) => Promise<unknown> }
  >;
  const targetTool = tools[toolName];

  if (!targetTool || typeof targetTool.execute !== "function") {
    return NextResponse.json(
      createToolBridgeErrorResponse({
        code: "not_found:tool_bridge",
        message: `Unknown agent tool: ${toolName}`,
        status: 404,
        toolName,
      }),
      { status: 404 },
    );
  }

  try {
    const data = await targetTool.execute(body.input ?? {}, {
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

    return NextResponse.json(
      createToolBridgeErrorResponse({
        code: "failed:tool_bridge",
        message:
          error instanceof Error ? error.message : "Tool execution failed",
        status: 500,
        retryable: true,
        toolName,
      }),
      { status: 500 },
    );
  }
}
