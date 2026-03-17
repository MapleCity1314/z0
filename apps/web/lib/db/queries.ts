import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "./index";
import {
  agentRun,
  artifact,
  chat,
  message,
  toolCall,
  user,
  type AgentRun,
  type Artifact,
  type Chat,
  type DBMessage,
  type ToolCall,
  type User,
} from "../schema";

export async function getChatById(id: string): Promise<Chat | undefined> {
  const [result] = await db.select().from(chat).where(eq(chat.id, id)).limit(1);
  return result;
}

export async function getChatsByUserId(
  userId: string,
  limit = 20,
): Promise<Chat[]> {
  return await db
    .select()
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.createdAt))
    .limit(limit);
}

export async function getMessagesByChatId(
  chatId: string,
): Promise<DBMessage[]> {
  return await db
    .select()
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(message.createdAt);
}

export async function saveMessages(messages: DBMessage[]): Promise<void> {
  if (messages.length === 0) {
    console.log("[saveMessages] ⚠️ No messages to save");
    return;
  }

  try {
    console.log("[saveMessages] 💾 Saving", messages.length, "message(s)...");
    console.log(
      "[saveMessages] 📋 Message data:",
      JSON.stringify(messages, null, 2),
    );

    for (const item of messages) {
      await db
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

    console.log("[saveMessages] ✅ Messages saved successfully");
  } catch (error) {
    console.error("[saveMessages] ❌ Database error:", error);
    console.error("[saveMessages] 📋 Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      detail: (error as any)?.detail,
      constraint: (error as any)?.constraint,
    });
    throw error;
  }
}

export async function saveAgentRun(
  run: Omit<AgentRun, "createdAt" | "updatedAt"> & {
    createdAt?: Date;
    updatedAt?: Date;
  },
): Promise<AgentRun> {
  const now = new Date();
  const [savedRun] = await db
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
    await db
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
  try {
    console.log("[createChat] 🔧 Inserting chat into database:", chatData);
    const [newChat] = await db.insert(chat).values(chatData).returning();
    console.log("[createChat] ✅ Database insert successful:", newChat);
    return newChat;
  } catch (error) {
    console.error("[createChat] ❌ Database error:", error);
    console.error("[createChat] 📋 Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      detail: (error as any)?.detail,
      constraint: (error as any)?.constraint,
    });
    throw error;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const [result] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  return result || null;
}

export async function updateChatProjectId(
  chatId: string,
  projectId: string,
): Promise<Chat | undefined> {
  const [updated] = await db
    .update(chat)
    .set({ projectId })
    .where(eq(chat.id, chatId))
    .returning();
  return updated;
}

export async function deleteChat(chatId: string): Promise<void> {
  // Delete artifacts first (foreign key constraint with cascade)
  await db.delete(artifact).where(eq(artifact.chatId, chatId));
  // Delete messages
  await db.delete(message).where(eq(message.chatId, chatId));
  // Then delete the chat
  await db.delete(chat).where(eq(chat.id, chatId));
}

/* -------------------------------
   Artifact Queries
---------------------------------*/

export async function getArtifactsByChatId(
  chatId: string,
): Promise<Artifact[]> {
  return await db
    .select()
    .from(artifact)
    .where(eq(artifact.chatId, chatId))
    .orderBy(artifact.createdAt);
}

export async function getArtifactByIndex(
  chatId: string,
  index: string,
): Promise<Artifact | undefined> {
  const [result] = await db
    .select()
    .from(artifact)
    .where(and(eq(artifact.chatId, chatId), eq(artifact.index, index)))
    .limit(1);
  return result;
}

export async function getArtifactById(
  id: string,
): Promise<Artifact | undefined> {
  const [result] = await db
    .select()
    .from(artifact)
    .where(eq(artifact.id, id))
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
  const [newArtifact] = await db
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
  const [updated] = await db
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
