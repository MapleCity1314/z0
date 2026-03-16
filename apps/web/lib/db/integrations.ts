import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  chat,
  chatMcpServer,
  chatSkill,
  mcpServer,
  skill,
  userMcpServer,
  userSkill,
} from "../schema";

function now() {
  return new Date();
}

async function assertChatOwnership(chatId: string, userId: string) {
  const [record] = await db
    .select({ id: chat.id })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
    .limit(1);

  return !!record;
}

export type ChatMCPView = {
  userMcpServerId: string;
  systemServerId: string;
  systemServerName: string;
  endpoint: string;
  sourceType: string;
  useByDefault: boolean;
  enabledInChat: boolean;
};

export type ChatSkillView = {
  userSkillId: string;
  systemSkillId: string;
  systemSkillName: string;
  directory: string;
  sourceType: string;
  useByDefault: boolean;
  enabledInChat: boolean;
};

export type SystemMCPView = {
  systemServerId: string;
  name: string;
  endpoint: string;
  sourceType: string;
};

export type SystemSkillView = {
  systemSkillId: string;
  name: string;
  directory: string;
  sourceType: string;
};

export async function getSystemMcpServers(): Promise<SystemMCPView[]> {
  const rows = await db
    .select({
      systemServerId: mcpServer.id,
      name: mcpServer.name,
      endpoint: mcpServer.endpoint,
      sourceType: mcpServer.sourceType,
    })
    .from(mcpServer)
    .where(eq(mcpServer.isActive, true))
    .orderBy(desc(mcpServer.updatedAt));

  return rows.map((row) => ({
    systemServerId: row.systemServerId,
    name: row.name,
    endpoint: row.endpoint,
    sourceType: row.sourceType ?? "external",
  }));
}

export async function getSystemSkills(): Promise<SystemSkillView[]> {
  const rows = await db
    .select({
      systemSkillId: skill.id,
      name: skill.name,
      directory: skill.directory,
      sourceType: skill.sourceType,
    })
    .from(skill)
    .where(eq(skill.isActive, true))
    .orderBy(desc(skill.updatedAt));

  return rows.map((row) => ({
    systemSkillId: row.systemSkillId,
    name: row.name,
    directory: row.directory,
    sourceType: row.sourceType ?? "external",
  }));
}

export async function getChatMcpServers(
  userId: string,
  chatId: string,
): Promise<ChatMCPView[]> {
  const rows = await db
    .select({
      userMcpServerId: userMcpServer.id,
      systemServerId: mcpServer.id,
      systemServerName: mcpServer.name,
      endpoint: mcpServer.endpoint,
      sourceType: mcpServer.sourceType,
      useByDefault: userMcpServer.useByDefault,
      enabledInChat: chatMcpServer.enabled,
      linkedChatId: chatMcpServer.chatId,
    })
    .from(userMcpServer)
    .innerJoin(mcpServer, eq(userMcpServer.mcpServerId, mcpServer.id))
    .leftJoin(
      chatMcpServer,
      and(
        eq(chatMcpServer.userMcpServerId, userMcpServer.id),
        eq(chatMcpServer.chatId, chatId),
      ),
    )
    .where(eq(userMcpServer.userId, userId))
    .orderBy(desc(userMcpServer.updatedAt));

  return rows.map((row) => ({
    userMcpServerId: row.userMcpServerId,
    systemServerId: row.systemServerId,
    systemServerName: row.systemServerName,
    endpoint: row.endpoint,
    sourceType: row.sourceType ?? "external",
    useByDefault: row.useByDefault,
    enabledInChat:
      row.linkedChatId === chatId ? (row.enabledInChat ?? false) : false,
  }));
}

export async function getUserMcpServers(
  userId: string,
): Promise<ChatMCPView[]> {
  const rows = await db
    .select({
      userMcpServerId: userMcpServer.id,
      systemServerId: mcpServer.id,
      systemServerName: mcpServer.name,
      endpoint: mcpServer.endpoint,
      sourceType: mcpServer.sourceType,
      useByDefault: userMcpServer.useByDefault,
    })
    .from(userMcpServer)
    .innerJoin(mcpServer, eq(userMcpServer.mcpServerId, mcpServer.id))
    .where(eq(userMcpServer.userId, userId))
    .orderBy(desc(userMcpServer.updatedAt));

  return rows.map((row) => ({
    userMcpServerId: row.userMcpServerId,
    systemServerId: row.systemServerId,
    systemServerName: row.systemServerName,
    endpoint: row.endpoint,
    sourceType: row.sourceType ?? "external",
    useByDefault: row.useByDefault,
    enabledInChat: false,
  }));
}

export async function addMcpServerForUser(params: {
  userId: string;
  name: string;
  endpoint: string;
  sourceType?: string;
}) {
  const { userId, name, endpoint, sourceType = "external" } = params;

  const [systemRecord] = await db
    .insert(mcpServer)
    .values({
      name,
      endpoint,
      sourceType,
      createdBy: userId,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: mcpServer.endpoint,
      set: {
        name,
        sourceType,
        updatedAt: now(),
      },
    })
    .returning({ id: mcpServer.id });

  const [userRecord] = await db
    .insert(userMcpServer)
    .values({
      userId,
      mcpServerId: systemRecord.id,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: [userMcpServer.userId, userMcpServer.mcpServerId],
      set: { updatedAt: now() },
    })
    .returning({ id: userMcpServer.id });

  return userRecord.id;
}

export async function addMcpServerForChat(params: {
  userId: string;
  chatId: string;
  name: string;
  endpoint: string;
  sourceType?: string;
}) {
  const { userId, chatId, name, endpoint, sourceType = "external" } = params;

  const ownsChat = await assertChatOwnership(chatId, userId);
  if (!ownsChat) {
    throw new Error("Chat not found or access denied");
  }

  const userMcpServerId = await addMcpServerForUser({
    userId,
    name,
    endpoint,
    sourceType,
  });

  await db
    .insert(chatMcpServer)
    .values({
      chatId,
      userMcpServerId,
      enabled: true,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: [chatMcpServer.chatId, chatMcpServer.userMcpServerId],
      set: { enabled: true, updatedAt: now() },
    });

  return userMcpServerId;
}

export async function setUserMcpDefault(params: {
  userId: string;
  userMcpServerId: string;
  useByDefault: boolean;
}) {
  const { userId, userMcpServerId, useByDefault } = params;
  await db
    .update(userMcpServer)
    .set({ useByDefault, updatedAt: now() })
    .where(
      and(
        eq(userMcpServer.id, userMcpServerId),
        eq(userMcpServer.userId, userId),
      ),
    );
}

export async function setChatMcpEnabled(params: {
  userId: string;
  chatId: string;
  userMcpServerId: string;
  enabled: boolean;
}) {
  const { userId, chatId, userMcpServerId, enabled } = params;

  const ownsChat = await assertChatOwnership(chatId, userId);
  if (!ownsChat) {
    throw new Error("Chat not found or access denied");
  }

  await db
    .insert(chatMcpServer)
    .values({
      chatId,
      userMcpServerId,
      enabled,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: [chatMcpServer.chatId, chatMcpServer.userMcpServerId],
      set: { enabled, updatedAt: now() },
    });
}

export async function getChatSkills(
  userId: string,
  chatId: string,
): Promise<ChatSkillView[]> {
  const rows = await db
    .select({
      userSkillId: userSkill.id,
      systemSkillId: skill.id,
      systemSkillName: skill.name,
      directory: skill.directory,
      sourceType: skill.sourceType,
      useByDefault: userSkill.useByDefault,
      enabledInChat: chatSkill.enabled,
      linkedChatId: chatSkill.chatId,
    })
    .from(userSkill)
    .innerJoin(skill, eq(userSkill.skillId, skill.id))
    .leftJoin(
      chatSkill,
      and(
        eq(chatSkill.userSkillId, userSkill.id),
        eq(chatSkill.chatId, chatId),
      ),
    )
    .where(eq(userSkill.userId, userId))
    .orderBy(desc(userSkill.updatedAt));

  return rows.map((row) => ({
    userSkillId: row.userSkillId,
    systemSkillId: row.systemSkillId,
    systemSkillName: row.systemSkillName,
    directory: row.directory,
    sourceType: row.sourceType ?? "external",
    useByDefault: row.useByDefault,
    enabledInChat:
      row.linkedChatId === chatId ? (row.enabledInChat ?? false) : false,
  }));
}

export async function getUserSkills(userId: string): Promise<ChatSkillView[]> {
  const rows = await db
    .select({
      userSkillId: userSkill.id,
      systemSkillId: skill.id,
      systemSkillName: skill.name,
      directory: skill.directory,
      sourceType: skill.sourceType,
      useByDefault: userSkill.useByDefault,
    })
    .from(userSkill)
    .innerJoin(skill, eq(userSkill.skillId, skill.id))
    .where(eq(userSkill.userId, userId))
    .orderBy(desc(userSkill.updatedAt));

  return rows.map((row) => ({
    userSkillId: row.userSkillId,
    systemSkillId: row.systemSkillId,
    systemSkillName: row.systemSkillName,
    directory: row.directory,
    sourceType: row.sourceType ?? "external",
    useByDefault: row.useByDefault,
    enabledInChat: false,
  }));
}

export async function addSkillForUser(params: {
  userId: string;
  name: string;
  directory: string;
  sourceType?: string;
}) {
  const { userId, name, directory, sourceType = "external" } = params;

  const [systemRecord] = await db
    .insert(skill)
    .values({
      name,
      directory,
      sourceType,
      createdBy: userId,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: [skill.name, skill.directory],
      set: { sourceType, updatedAt: now() },
    })
    .returning({ id: skill.id });

  const [userRecord] = await db
    .insert(userSkill)
    .values({
      userId,
      skillId: systemRecord.id,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: [userSkill.userId, userSkill.skillId],
      set: { updatedAt: now() },
    })
    .returning({ id: userSkill.id });

  return userRecord.id;
}

export async function addSkillForChat(params: {
  userId: string;
  chatId: string;
  name: string;
  directory: string;
  sourceType?: string;
}) {
  const { userId, chatId, name, directory, sourceType = "external" } = params;

  const ownsChat = await assertChatOwnership(chatId, userId);
  if (!ownsChat) {
    throw new Error("Chat not found or access denied");
  }

  const userSkillId = await addSkillForUser({
    userId,
    name,
    directory,
    sourceType,
  });

  await db
    .insert(chatSkill)
    .values({
      chatId,
      userSkillId,
      enabled: true,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: [chatSkill.chatId, chatSkill.userSkillId],
      set: { enabled: true, updatedAt: now() },
    });

  return userSkillId;
}

export async function setUserSkillDefault(params: {
  userId: string;
  userSkillId: string;
  useByDefault: boolean;
}) {
  const { userId, userSkillId, useByDefault } = params;
  await db
    .update(userSkill)
    .set({ useByDefault, updatedAt: now() })
    .where(and(eq(userSkill.id, userSkillId), eq(userSkill.userId, userId)));
}

export async function setChatSkillEnabled(params: {
  userId: string;
  chatId: string;
  userSkillId: string;
  enabled: boolean;
}) {
  const { userId, chatId, userSkillId, enabled } = params;

  const ownsChat = await assertChatOwnership(chatId, userId);
  if (!ownsChat) {
    throw new Error("Chat not found or access denied");
  }

  await db
    .insert(chatSkill)
    .values({
      chatId,
      userSkillId,
      enabled,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: [chatSkill.chatId, chatSkill.userSkillId],
      set: { enabled, updatedAt: now() },
    });
}

export async function linkUserDefaultIntegrationsToChat(params: {
  userId: string;
  chatId: string;
}) {
  const { userId, chatId } = params;

  const ownsChat = await assertChatOwnership(chatId, userId);
  if (!ownsChat) {
    throw new Error("Chat not found or access denied");
  }

  const [defaultMcpRows, defaultSkillRows] = await Promise.all([
    db
      .select({ userMcpServerId: userMcpServer.id })
      .from(userMcpServer)
      .where(
        and(
          eq(userMcpServer.userId, userId),
          eq(userMcpServer.useByDefault, true),
        ),
      ),
    db
      .select({ userSkillId: userSkill.id })
      .from(userSkill)
      .where(
        and(eq(userSkill.userId, userId), eq(userSkill.useByDefault, true)),
      ),
  ]);

  if (defaultMcpRows.length > 0) {
    await db
      .insert(chatMcpServer)
      .values(
        defaultMcpRows.map((row) => ({
          chatId,
          userMcpServerId: row.userMcpServerId,
          enabled: true,
          createdAt: now(),
          updatedAt: now(),
        })),
      )
      .onConflictDoUpdate({
        target: [chatMcpServer.chatId, chatMcpServer.userMcpServerId],
        set: { enabled: true, updatedAt: now() },
      });
  }

  if (defaultSkillRows.length > 0) {
    await db
      .insert(chatSkill)
      .values(
        defaultSkillRows.map((row) => ({
          chatId,
          userSkillId: row.userSkillId,
          enabled: true,
          createdAt: now(),
          updatedAt: now(),
        })),
      )
      .onConflictDoUpdate({
        target: [chatSkill.chatId, chatSkill.userSkillId],
        set: { enabled: true, updatedAt: now() },
      });
  }
}
