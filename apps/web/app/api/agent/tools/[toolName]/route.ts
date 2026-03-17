import { NextRequest, NextResponse } from "next/server";
import { buildAgentTools } from "@/lib/agent/chat/tools";

function getAgentBridgeToken() {
  if (process.env.AGENT_BRIDGE_TOKEN) {
    return process.env.AGENT_BRIDGE_TOKEN;
  }

  if (process.env.NODE_ENV !== "production") {
    return "local-dev-agent-bridge-token";
  }

  return null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolName: string }> },
) {
  const expectedToken = getAgentBridgeToken();
  const providedToken = request.headers.get("x-agent-bridge-token");

  if (!expectedToken || providedToken !== expectedToken) {
    return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
  }

  const { toolName } = await context.params;
  const body = (await request.json()) as {
    chatId?: string;
    projectId?: string | null;
    toolCallId?: string;
    input?: unknown;
  };

  const tools = buildAgentTools(true, body.projectId ?? null) as Record<
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
