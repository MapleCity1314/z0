import { and, desc, eq } from "drizzle-orm";
import {
  getConnectorAuthStatus,
  getConnectorCatalogItem,
  type ConnectorAuthMetadata,
} from "@z0/backend";
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
  connectorSlug: string | null;
  requiresAuth: boolean;
  authProvider: string | null;
  authStatus: "not-required" | "not-connected" | "connected" | "expired";
  privacyLevel: "low" | "high" | null;
  connectedAt: string | null;
  consentGrantedAt: string | null;
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
  slug: string;
  icon: string;
  category: string;
  provider: string;
  shortDescription: string;
  setupLabel: string;
  docsUrl: string | null;
  tags: string[];
  recommended: boolean;
  requiresSetup: boolean;
  requiresAuth: boolean;
  authProvider: string | null;
  privacyLevel: "low" | "high" | null;
  consentRequired: boolean;
  scopes: string[];
};

function mapSystemMcpRow(row: {
  systemServerId: string;
  name: string;
  endpoint: string;
  sourceType: string | null;
  metadata: unknown;
}): SystemMCPView {
  const metadata =
    typeof row.metadata === "object" && row.metadata !== null
      ? (row.metadata as Record<string, unknown>)
      : {};
  const slug =
    typeof metadata.slug === "string" ? metadata.slug : row.name.toLowerCase();
  const connector = row.sourceType === "market" ? getConnectorCatalogItem(slug) ?? null : null;
  const runtimeReadyWithoutAuth =
    connector !== null &&
    connector.requiresAuth === false &&
    connector.endpoint.startsWith("npm:");
  const requiresSetup =
    (typeof metadata.requiresSetup === "boolean"
      ? metadata.requiresSetup
      : !(row.endpoint.startsWith("http://") || row.endpoint.startsWith("https://"))) &&
    !runtimeReadyWithoutAuth;

  return {
    systemServerId: row.systemServerId,
    name: row.name,
    endpoint: row.endpoint,
    sourceType: row.sourceType ?? "external",
    slug,
    icon: typeof metadata.icon === "string" ? metadata.icon : slug,
    category:
      typeof metadata.category === "string" ? metadata.category : "General",
    provider:
      typeof metadata.provider === "string" ? metadata.provider : row.name,
    shortDescription:
      typeof metadata.shortDescription === "string"
        ? metadata.shortDescription
        : `${row.name} tools for your agent workflows.`,
    setupLabel:
      typeof metadata.setupLabel === "string"
        ? metadata.setupLabel
        : requiresSetup
          ? "Requires external setup"
          : "Quick add",
    docsUrl: typeof metadata.docsUrl === "string" ? metadata.docsUrl : null,
    tags:
      Array.isArray(metadata.tags)
        ? metadata.tags.filter((item): item is string => typeof item === "string")
        : [],
    recommended: Boolean(metadata.recommended),
    requiresSetup,
    requiresAuth: connector?.requiresAuth ?? false,
    authProvider: connector?.authProvider ?? null,
    privacyLevel: connector?.privacyLevel ?? null,
    consentRequired: connector?.consentRequired ?? false,
    scopes: connector?.scopes ?? [],
  };
}

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
      metadata: mcpServer.metadata,
    })
    .from(mcpServer)
    .where(eq(mcpServer.isActive, true))
    .orderBy(desc(mcpServer.updatedAt));

  return rows.map((row) => mapSystemMcpRow(row));
}

export async function getSystemMcpServerBySlug(slug: string) {
  const rows = await getSystemMcpServers();
  return rows.find((row) => row.slug === slug) ?? null;
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
    .orderBy(desc(userMcpServer.updatedAt));

  return rows.map((row) => {
    const metadata =
      typeof row.metadata === "object" && row.metadata !== null
        ? (row.metadata as ConnectorAuthMetadata)
        : null;
    const connector =
      row.sourceType === "market" || metadata?.connectorSlug
        ? getConnectorCatalogItem(
            metadata?.connectorSlug ??
              (typeof row.systemMetadata === "object" &&
              row.systemMetadata !== null &&
              typeof (row.systemMetadata as { slug?: unknown }).slug === "string"
                ? ((row.systemMetadata as { slug: string }).slug)
                : ""),
          ) ?? null
        : null;

    return {
      userMcpServerId: row.userMcpServerId,
      systemServerId: row.systemServerId,
      systemServerName: row.systemServerName,
      endpoint: row.endpoint,
      sourceType: row.sourceType ?? "external",
      useByDefault: row.useByDefault,
      enabledInChat:
        row.linkedChatId === chatId ? (row.enabledInChat ?? false) : false,
      connectorSlug: connector?.slug ?? null,
      requiresAuth: connector?.requiresAuth ?? false,
      authProvider: connector?.authProvider ?? null,
      authStatus: getConnectorAuthStatus(connector, metadata),
      privacyLevel: connector?.privacyLevel ?? null,
      connectedAt: metadata?.connectedAt ?? null,
      consentGrantedAt: metadata?.consentGrantedAt ?? null,
    } satisfies ChatMCPView;
  });
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
      metadata: userMcpServer.metadata,
      systemMetadata: mcpServer.metadata,
    })
    .from(userMcpServer)
    .innerJoin(mcpServer, eq(userMcpServer.mcpServerId, mcpServer.id))
    .where(eq(userMcpServer.userId, userId))
    .orderBy(desc(userMcpServer.updatedAt));

  return rows.map((row) => {
    const metadata =
      typeof row.metadata === "object" && row.metadata !== null
        ? (row.metadata as ConnectorAuthMetadata)
        : null;
    const connector =
      row.sourceType === "market" || metadata?.connectorSlug
        ? getConnectorCatalogItem(
            metadata?.connectorSlug ??
              (typeof row.systemMetadata === "object" &&
              row.systemMetadata !== null &&
              typeof (row.systemMetadata as { slug?: unknown }).slug === "string"
                ? ((row.systemMetadata as { slug: string }).slug)
                : ""),
          ) ?? null
        : null;

    return {
      userMcpServerId: row.userMcpServerId,
      systemServerId: row.systemServerId,
      systemServerName: row.systemServerName,
      endpoint: row.endpoint,
      sourceType: row.sourceType ?? "external",
      useByDefault: row.useByDefault,
      enabledInChat: false,
      connectorSlug: connector?.slug ?? null,
      requiresAuth: connector?.requiresAuth ?? false,
      authProvider: connector?.authProvider ?? null,
      authStatus: getConnectorAuthStatus(connector, metadata),
      privacyLevel: connector?.privacyLevel ?? null,
      connectedAt: metadata?.connectedAt ?? null,
      consentGrantedAt: metadata?.consentGrantedAt ?? null,
    } satisfies ChatMCPView;
  });
}

export async function addMcpServerForUser(params: {
  userId: string;
  name: string;
  endpoint: string;
  sourceType?: string;
  metadata?: Record<string, unknown>;
}) {
  const { userId, name, endpoint, sourceType = "external", metadata = {} } = params;

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
      metadata,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: [userMcpServer.userId, userMcpServer.mcpServerId],
      set: { metadata, updatedAt: now() },
    })
    .returning({ id: userMcpServer.id });

  return userRecord.id;
}

export async function connectOAuthMcpServerForUser(params: {
  userId: string;
  systemServerId: string;
  metadata: ConnectorAuthMetadata;
  chatId?: string | null;
}) {
  const timestamp = now();
  const [userRecord] = await db
    .insert(userMcpServer)
    .values({
      userId: params.userId,
      mcpServerId: params.systemServerId,
      metadata: params.metadata,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: [userMcpServer.userId, userMcpServer.mcpServerId],
      set: {
        metadata: params.metadata,
        updatedAt: now(),
      },
    })
    .returning({ id: userMcpServer.id });

  if (params.chatId) {
    await db
      .insert(chatMcpServer)
      .values({
        chatId: params.chatId,
        userMcpServerId: userRecord.id,
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: [chatMcpServer.chatId, chatMcpServer.userMcpServerId],
        set: {
          enabled: true,
          updatedAt: now(),
        },
      });
  }

  return userRecord.id;
}

export async function disconnectOAuthMcpServerForUser(params: {
  userId: string;
  userMcpServerId: string;
}) {
  const [record] = await db
    .select({
      id: userMcpServer.id,
      metadata: userMcpServer.metadata,
      systemMetadata: mcpServer.metadata,
    })
    .from(userMcpServer)
    .innerJoin(mcpServer, eq(userMcpServer.mcpServerId, mcpServer.id))
    .where(
      and(
        eq(userMcpServer.id, params.userMcpServerId),
        eq(userMcpServer.userId, params.userId),
      ),
    )
    .limit(1);

  if (!record) {
    throw new Error("Connector not found or access denied");
  }

  const existingMetadata =
    typeof record.metadata === "object" && record.metadata !== null
      ? (record.metadata as ConnectorAuthMetadata)
      : {};
  const systemSlug =
    typeof record.systemMetadata === "object" &&
    record.systemMetadata !== null &&
    typeof (record.systemMetadata as { slug?: unknown }).slug === "string"
      ? (record.systemMetadata as { slug: string }).slug
      : undefined;

  const nextMetadata: ConnectorAuthMetadata = {
    connectorSlug: existingMetadata.connectorSlug ?? systemSlug,
    provider: existingMetadata.provider,
    authProvider: existingMetadata.authProvider,
  };

  await db
    .update(userMcpServer)
    .set({
      metadata: nextMetadata,
      useByDefault: false,
      updatedAt: now(),
    })
    .where(
      and(
        eq(userMcpServer.id, params.userMcpServerId),
        eq(userMcpServer.userId, params.userId),
      ),
    );

  await db
    .update(chatMcpServer)
    .set({
      enabled: false,
      updatedAt: now(),
    })
    .where(eq(chatMcpServer.userMcpServerId, params.userMcpServerId));
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

  console.log("[Integrations] Linking default integrations to chat", {
    userId,
    chatId,
    defaultMcpCount: defaultMcpRows.length,
    defaultMcpIds: defaultMcpRows.map((row) => row.userMcpServerId),
    defaultSkillCount: defaultSkillRows.length,
    defaultSkillIds: defaultSkillRows.map((row) => row.userSkillId),
  });

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

  console.log("[Integrations] Finished linking defaults to chat", {
    userId,
    chatId,
    linkedMcpCount: defaultMcpRows.length,
    linkedSkillCount: defaultSkillRows.length,
  });
}
