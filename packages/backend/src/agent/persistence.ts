import { and, desc, eq, sql } from "drizzle-orm";
import {
  agentRun,
  artifact,
  chat,
  getDb,
  message,
  toolCall,
  type AgentRun,
  type Artifact,
  type Chat,
  type DBMessage,
  type ToolCall,
} from "@z0/db";

function db() {
  return getDb();
}

export async function getChatById(id: string): Promise<Chat | undefined> {
  const [result] = await db().select().from(chat).where(eq(chat.id, id)).limit(1);
  return result;
}

export async function getChatsByUserId(
  userId: string,
  limit = 20,
): Promise<Chat[]> {
  return db()
    .select()
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.createdAt))
    .limit(limit);
}

export async function getMessagesByChatId(chatId: string): Promise<DBMessage[]> {
  return db()
    .select()
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(message.createdAt);
}

export async function saveMessages(messages: DBMessage[]): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  for (const item of messages) {
    await db()
      .insert(message)
      .values(item)
      .onConflictDoUpdate({
        target: message.id,
        set: {
          role: item.role,
          parts: sql`excluded.parts`,
          attachments: sql`excluded.attachments`,
          createdAt: item.createdAt,
        },
      });
  }
}

export async function saveAgentRun(
  run: Omit<AgentRun, "createdAt" | "updatedAt"> & {
    createdAt?: Date;
    updatedAt?: Date;
  },
): Promise<AgentRun> {
  const now = new Date();
  const [savedRun] = await db()
    .insert(agentRun)
    .values({
      ...run,
      createdAt: run.createdAt ?? now,
      updatedAt: run.updatedAt ?? now,
    })
    .onConflictDoUpdate({
      target: agentRun.id,
      set: {
        projectId: run.projectId ?? null,
        parentRunId: run.parentRunId ?? null,
        rootRunId: run.rootRunId ?? null,
        triggerMessageId: run.triggerMessageId ?? null,
        agentKind: run.agentKind,
        agentName: run.agentName ?? null,
        model: run.model,
        status: run.status,
        finishReason: run.finishReason ?? null,
        webSearchEnabled: run.webSearchEnabled,
        isReasoning: run.isReasoning,
        messageCount: run.messageCount,
        promptTokens: run.promptTokens,
        completionTokens: run.completionTokens,
        totalTokens: run.totalTokens,
        credits: run.credits,
        cost: run.cost ?? null,
        metadata: sql`excluded.metadata`,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt ?? null,
        updatedAt: run.updatedAt ?? now,
      },
    })
    .returning();

  return savedRun;
}

export async function saveToolCalls(calls: ToolCall[]): Promise<void> {
  if (calls.length === 0) {
    return;
  }

  for (const item of calls) {
    await db()
      .insert(toolCall)
      .values(item)
      .onConflictDoUpdate({
        target: [toolCall.runId, toolCall.toolCallId],
        set: {
          chatId: item.chatId,
          messageId: item.messageId ?? null,
          toolName: item.toolName,
          state: item.state,
          input: sql`excluded.input`,
          output: sql`excluded.output`,
          errorText: item.errorText ?? null,
          metadata: sql`excluded.metadata`,
          startedAt: item.startedAt,
          finishedAt: item.finishedAt ?? null,
          updatedAt: item.updatedAt,
        },
      });
  }
}

export async function createChat(chatData: {
  id: string;
  title: string;
  userId: string;
  projectId?: string;
  createdAt: Date;
}): Promise<Chat> {
  const [newChat] = await db().insert(chat).values(chatData).returning();
  return newChat;
}

export async function updateChatProjectId(
  chatId: string,
  projectId: string,
): Promise<Chat | undefined> {
  const [updated] = await db()
    .update(chat)
    .set({ projectId })
    .where(eq(chat.id, chatId))
    .returning();
  return updated;
}

export async function updateChatProjectLinkFromToolResults(
  chatId: string,
  toolResults: unknown,
) {
  if (!Array.isArray(toolResults) || toolResults.length === 0) return;

  for (const item of toolResults as Array<Record<string, unknown>>) {
    if (item?.toolName !== "createProject" || !("result" in item)) continue;

    const result = item.result as { success?: boolean; projectId?: string };
    if (!result?.success || !result.projectId) continue;

    await updateChatProjectId(chatId, result.projectId);
    return;
  }
}

export async function deleteChat(chatId: string): Promise<void> {
  await db().delete(artifact).where(eq(artifact.chatId, chatId));
  await db().delete(message).where(eq(message.chatId, chatId));
  await db().delete(chat).where(eq(chat.id, chatId));
}

export async function getArtifactsByChatId(chatId: string): Promise<Artifact[]> {
  return db()
    .select()
    .from(artifact)
    .where(eq(artifact.chatId, chatId))
    .orderBy(artifact.createdAt);
}

export async function getArtifactByIndex(
  chatId: string,
  index: string,
): Promise<Artifact | undefined> {
  const [result] = await db()
    .select()
    .from(artifact)
    .where(and(eq(artifact.chatId, chatId), eq(artifact.index, index)))
    .limit(1);
  return result;
}

export async function createArtifact(data: {
  id?: string;
  chatId: string;
  index: string;
  title: string;
  language: string;
  code: string;
  description?: string;
}): Promise<Artifact> {
  const now = new Date();
  const [newArtifact] = await db()
    .insert(artifact)
    .values({
      ...data,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return newArtifact;
}

export async function updateArtifactCode(
  id: string,
  code: string,
): Promise<Artifact | undefined> {
  const [updated] = await db()
    .update(artifact)
    .set({ code, updatedAt: new Date() })
    .where(eq(artifact.id, id))
    .returning();
  return updated;
}

export async function getNextArtifactIndex(chatId: string): Promise<string> {
  const artifacts = await getArtifactsByChatId(chatId);
  return `A${artifacts.length + 1}`;
}
