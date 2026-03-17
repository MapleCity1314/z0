import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { verifyInternalAuthHeaders } from "@z0/backend";
import { buildAgentTools } from "@/lib/agent/chat/tools";
import { db } from "@/lib/db";
import { chat, project } from "@/lib/schema";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolName: string }> },
) {
  const actor = verifyInternalAuthHeaders(request.headers, "agent-bridge");

  if (!actor) {
    return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
  }

  const { toolName } = await context.params;
  const body = (await request.json()) as {
    chatId?: string;
    projectId?: string | null;
    webSearchEnabled?: boolean;
    toolCallId?: string;
    input?: unknown;
  };

  if (body.chatId) {
    const [chatRecord] = await db
      .select({ id: chat.id })
      .from(chat)
      .where(and(eq(chat.id, body.chatId), eq(chat.userId, actor.userId)))
      .limit(1);

    if (!chatRecord) {
      return NextResponse.json(
        { error: { message: "Chat not found or access denied" } },
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
        { error: { message: "Project not found or access denied" } },
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
      { error: { message: `Unknown agent tool: ${toolName}` } },
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

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof Error ? error.message : "Tool execution failed",
        },
      },
      { status: 500 },
    );
  }
}
