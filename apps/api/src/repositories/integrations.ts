import { and, desc, eq } from "drizzle-orm";
import type {
  IntegrationMcpServerDto,
  IntegrationSkillDto,
  SystemMcpMarketItemDto,
  SystemSkillMarketItemDto,
} from "@z0/shared-types";
import type { IntegrationsRepository } from "@z0/backend";
import {
  chat,
  chatMcpServer,
  chatSkill,
  mcpServer,
  skill,
  userMcpServer,
  userSkill,
} from "@z0/backend";
import { mapIntegrationMcpServer, mapSystemMcpMarketItem } from "./mcp-market";
import { mergeSystemSkillMarketItems } from "./skill-market";
import { db } from "./shared";

function now() {
  return new Date();
}

export class DrizzleIntegrationsRepository implements IntegrationsRepository {
  chatBelongsToUser(chatId: string, userId: string) {
    return db
      .select({ id: chat.id })
      .from(chat)
      .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
      .limit(1)
      .then((rows) => rows.length > 0);
  }

  listSystemMcpServers(): Promise<SystemMcpMarketItemDto[]> {
    return db
      .select({
        systemServerId: mcpServer.id,
        name: mcpServer.name,
        endpoint: mcpServer.endpoint,
        sourceType: mcpServer.sourceType,
        metadata: mcpServer.metadata,
      })
      .from(mcpServer)
      .where(eq(mcpServer.isActive, true))
      .orderBy(desc(mcpServer.updatedAt))
      .then((rows) => rows.map((row) => mapSystemMcpMarketItem(row)));
  }

  listSystemSkills(): Promise<SystemSkillMarketItemDto[]> {
    return db
      .select({
        systemSkillId: skill.id,
        name: skill.name,
        directory: skill.directory,
        sourceType: skill.sourceType,
      })
      .from(skill)
      .where(eq(skill.isActive, true))
      .orderBy(desc(skill.updatedAt))
      .then((rows) =>
        mergeSystemSkillMarketItems(
          rows.map((row) => ({
            systemSkillId: row.systemSkillId,
            name: row.name,
            directory: row.directory,
            sourceType: row.sourceType ?? "external",
          })),
        ),
      );
  }

  listChatMcpServers(
    userId: string,
    chatId: string,
  ): Promise<IntegrationMcpServerDto[]> {
    return db
      .select({
        userMcpServerId: userMcpServer.id,
        systemServerId: mcpServer.id,
        systemServerName: mcpServer.name,
        endpoint: mcpServer.endpoint,
        sourceType: mcpServer.sourceType,
        useByDefault: userMcpServer.useByDefault,
        enabledInChat: chatMcpServer.enabled,
        linkedChatId: chatMcpServer.chatId,
        metadata: userMcpServer.metadata,
        systemMetadata: mcpServer.metadata,
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
      .orderBy(desc(userMcpServer.updatedAt))
      .then((rows) =>
        rows.map((row) =>
          mapIntegrationMcpServer({
            userMcpServerId: row.userMcpServerId,
            systemServerId: row.systemServerId,
            systemServerName: row.systemServerName,
            endpoint: row.endpoint,
            sourceType: row.sourceType,
            useByDefault: row.useByDefault,
            enabledInChat:
              row.linkedChatId === chatId ? (row.enabledInChat ?? false) : false,
            metadata: row.metadata,
            systemMetadata: row.systemMetadata,
          }),
        ),
      );
  }

  listChatSkills(userId: string, chatId: string): Promise<IntegrationSkillDto[]> {
    return db
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
        and(eq(chatSkill.userSkillId, userSkill.id), eq(chatSkill.chatId, chatId)),
      )
      .where(eq(userSkill.userId, userId))
      .orderBy(desc(userSkill.updatedAt))
      .then((rows) =>
        rows.map((row) => ({
          userSkillId: row.userSkillId,
          systemSkillId: row.systemSkillId,
          systemSkillName: row.systemSkillName,
          directory: row.directory,
          sourceType: row.sourceType ?? "external",
          useByDefault: row.useByDefault,
          enabledInChat:
            row.linkedChatId === chatId ? (row.enabledInChat ?? false) : false,
        })),
      );
  }

  listUserMcpServers(userId: string): Promise<IntegrationMcpServerDto[]> {
    return db
      .select({
        userMcpServerId: userMcpServer.id,
        systemServerId: mcpServer.id,
        systemServerName: mcpServer.name,
        endpoint: mcpServer.endpoint,
        sourceType: mcpServer.sourceType,
        useByDefault: userMcpServer.useByDefault,
        metadata: userMcpServer.metadata,
        systemMetadata: mcpServer.metadata,
      })
      .from(userMcpServer)
      .innerJoin(mcpServer, eq(userMcpServer.mcpServerId, mcpServer.id))
      .where(eq(userMcpServer.userId, userId))
      .orderBy(desc(userMcpServer.updatedAt))
      .then((rows) =>
        rows.map((row) =>
          mapIntegrationMcpServer({
            userMcpServerId: row.userMcpServerId,
            systemServerId: row.systemServerId,
            systemServerName: row.systemServerName,
            endpoint: row.endpoint,
            sourceType: row.sourceType,
            useByDefault: row.useByDefault,
            enabledInChat: false,
            metadata: row.metadata,
            systemMetadata: row.systemMetadata,
          }),
        ),
      );
  }

  listUserSkills(userId: string): Promise<IntegrationSkillDto[]> {
    return db
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
      .orderBy(desc(userSkill.updatedAt))
      .then((rows) =>
        rows.map((row) => ({
          userSkillId: row.userSkillId,
          systemSkillId: row.systemSkillId,
          systemSkillName: row.systemSkillName,
          directory: row.directory,
          sourceType: row.sourceType ?? "external",
          useByDefault: row.useByDefault,
          enabledInChat: false,
        })),
      );
  }

  async addUserMcpServer(input: {
    userId: string;
    name: string;
    endpoint: string;
    sourceType: string;
  }) {
    const timestamp = now();
    const [systemRecord] = await db
      .insert(mcpServer)
      .values({
        name: input.name,
        endpoint: input.endpoint,
        sourceType: input.sourceType,
        createdBy: input.userId,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: mcpServer.endpoint,
        set: {
          name: input.name,
          sourceType: input.sourceType,
          updatedAt: now(),
        },
      })
      .returning({ id: mcpServer.id });

    const [userRecord] = await db
      .insert(userMcpServer)
      .values({
        userId: input.userId,
        mcpServerId: systemRecord.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: [userMcpServer.userId, userMcpServer.mcpServerId],
        set: { updatedAt: now() },
      })
      .returning({ id: userMcpServer.id });

    return userRecord.id;
  }

  async addUserSkill(input: {
    userId: string;
    name: string;
    directory: string;
    sourceType: string;
  }) {
    const timestamp = now();
    const [systemRecord] = await db
      .insert(skill)
      .values({
        name: input.name,
        directory: input.directory,
        sourceType: input.sourceType,
        createdBy: input.userId,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: [skill.name, skill.directory],
        set: {
          sourceType: input.sourceType,
          updatedAt: now(),
        },
      })
      .returning({ id: skill.id });

    const [userRecord] = await db
      .insert(userSkill)
      .values({
        userId: input.userId,
        skillId: systemRecord.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: [userSkill.userId, userSkill.skillId],
        set: { updatedAt: now() },
      })
      .returning({ id: userSkill.id });

    return userRecord.id;
  }

  findUserMcpServer(userMcpServerId: string) {
    return db
      .select({
        id: userMcpServer.id,
        userId: userMcpServer.userId,
      })
      .from(userMcpServer)
      .where(eq(userMcpServer.id, userMcpServerId))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  findUserSkill(userSkillId: string) {
    return db
      .select({
        id: userSkill.id,
        userId: userSkill.userId,
      })
      .from(userSkill)
      .where(eq(userSkill.id, userSkillId))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  async setUserMcpDefault(input: {
    userMcpServerId: string;
    useByDefault: boolean;
  }) {
    await db
      .update(userMcpServer)
      .set({ useByDefault: input.useByDefault, updatedAt: now() })
      .where(eq(userMcpServer.id, input.userMcpServerId));
  }

  async setUserSkillDefault(input: {
    userSkillId: string;
    useByDefault: boolean;
  }) {
    await db
      .update(userSkill)
      .set({ useByDefault: input.useByDefault, updatedAt: now() })
      .where(eq(userSkill.id, input.userSkillId));
  }

  async setChatMcpEnabled(input: {
    chatId: string;
    userMcpServerId: string;
    enabled: boolean;
  }) {
    await db
      .insert(chatMcpServer)
      .values({
        chatId: input.chatId,
        userMcpServerId: input.userMcpServerId,
        enabled: input.enabled,
        createdAt: now(),
        updatedAt: now(),
      })
      .onConflictDoUpdate({
        target: [chatMcpServer.chatId, chatMcpServer.userMcpServerId],
        set: { enabled: input.enabled, updatedAt: now() },
      });
  }

  async setChatSkillEnabled(input: {
    chatId: string;
    userSkillId: string;
    enabled: boolean;
  }) {
    await db
      .insert(chatSkill)
      .values({
        chatId: input.chatId,
        userSkillId: input.userSkillId,
        enabled: input.enabled,
        createdAt: now(),
        updatedAt: now(),
      })
      .onConflictDoUpdate({
        target: [chatSkill.chatId, chatSkill.userSkillId],
        set: { enabled: input.enabled, updatedAt: now() },
      });
  }
}
