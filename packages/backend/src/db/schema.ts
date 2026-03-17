import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable(
  "User",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: varchar("name", { length: 64 }).notNull(),
    avatar: text("avatar"),
    email: varchar("email", { length: 320 }).notNull(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    password: varchar("password", { length: 255 }),
    role: varchar("role", { length: 32 }).default("user"),
    status: varchar("status", { length: 32 }).default("active"),
    lastLoginAt: timestamp("lastLoginAt"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [uniqueIndex("uniq_user_email").on(table.email)],
);

export type User = InferSelectModel<typeof user>;

export const session = pgTable(
  "Session",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    ipAddress: varchar("ipAddress", { length: 128 }),
    userAgent: text("userAgent"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("uniq_auth_session_token").on(table.token),
    index("idx_auth_session_user").on(table.userId),
  ],
);

export const account = pgTable(
  "Account",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    accountId: text("accountId").notNull(),
    providerId: varchar("providerId", { length: 64 }).notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("uniq_auth_provider_account").on(
      table.providerId,
      table.accountId,
    ),
    index("idx_auth_account_user").on(table.userId),
  ],
);

export const verification = pgTable(
  "Verification",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt"),
    updatedAt: timestamp("updatedAt"),
  },
  (table) => [index("idx_auth_verification_identifier").on(table.identifier)],
);

export const project = pgTable(
  "Project",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    visibility: varchar("visibility", { length: 32 })
      .notNull()
      .default("private"),
    files: json("files").notNull().default("{}"),
    buildConfig: json("buildConfig"),
    deploymentUrl: text("deploymentUrl"),
    deploymentProvider: varchar("deploymentProvider", { length: 64 }),
    tags: json("tags").default("[]"),
    likes: integer("likes").notNull().default(0),
    views: integer("views").notNull().default(0),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    publishedAt: timestamp("publishedAt"),
    lastDeployedAt: timestamp("lastDeployedAt"),
  },
  (table) => [
    index("idx_project_user").on(table.userId),
    index("idx_project_visibility").on(table.visibility),
    index("idx_project_user_updated").on(table.userId, table.updatedAt),
  ],
);

export type Project = InferSelectModel<typeof project>;

export const chat = pgTable(
  "Chat",
  {
    id: text("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    projectId: uuid("projectId").references(() => project.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("idx_chat_user").on(table.userId),
    index("idx_chat_project").on(table.projectId),
    index("idx_chat_user_created").on(table.userId, table.createdAt),
  ],
);

export type Chat = InferSelectModel<typeof chat>;

export const mcpServer = pgTable(
  "MCPServer",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: varchar("name", { length: 128 }).notNull(),
    endpoint: text("endpoint").notNull(),
    sourceType: varchar("sourceType", { length: 32 })
      .notNull()
      .default("external"),
    metadata: json("metadata").default("{}"),
    isActive: boolean("isActive").notNull().default(true),
    createdBy: uuid("createdBy").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [uniqueIndex("uniq_mcp_server_endpoint").on(table.endpoint)],
);

export type MCPServer = InferSelectModel<typeof mcpServer>;

export const userMcpServer = pgTable(
  "UserMCPServer",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mcpServerId: uuid("mcpServerId")
      .notNull()
      .references(() => mcpServer.id, { onDelete: "cascade" }),
    useByDefault: boolean("useByDefault").notNull().default(false),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("uniq_user_mcp_server").on(table.userId, table.mcpServerId),
    index("idx_user_mcp_server_user").on(table.userId),
  ],
);

export type UserMCPServer = InferSelectModel<typeof userMcpServer>;

export const chatMcpServer = pgTable(
  "ChatMCPServer",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: text("chatId")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    userMcpServerId: uuid("userMcpServerId")
      .notNull()
      .references(() => userMcpServer.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("uniq_chat_mcp_link").on(table.chatId, table.userMcpServerId),
    index("idx_chat_mcp_chat").on(table.chatId),
  ],
);

export type ChatMCPServer = InferSelectModel<typeof chatMcpServer>;

export const skill = pgTable(
  "Skill",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: varchar("name", { length: 128 }).notNull(),
    directory: text("directory").notNull(),
    sourceType: varchar("sourceType", { length: 32 })
      .notNull()
      .default("external"),
    metadata: json("metadata").default("{}"),
    isActive: boolean("isActive").notNull().default(true),
    createdBy: uuid("createdBy").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("uniq_skill_name_directory").on(table.name, table.directory),
  ],
);

export type Skill = InferSelectModel<typeof skill>;

export const userSkill = pgTable(
  "UserSkill",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    skillId: uuid("skillId")
      .notNull()
      .references(() => skill.id, { onDelete: "cascade" }),
    useByDefault: boolean("useByDefault").notNull().default(false),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("uniq_user_skill").on(table.userId, table.skillId),
    index("idx_user_skill_user").on(table.userId),
  ],
);

export type UserSkill = InferSelectModel<typeof userSkill>;

export const chatSkill = pgTable(
  "ChatSkill",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: text("chatId")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    userSkillId: uuid("userSkillId")
      .notNull()
      .references(() => userSkill.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("uniq_chat_skill_link").on(table.chatId, table.userSkillId),
    index("idx_chat_skill_chat").on(table.chatId),
  ],
);

export type ChatSkill = InferSelectModel<typeof chatSkill>;

export const message = pgTable(
  "messages",
  {
    id: text("id").primaryKey().notNull(),
    chatId: text("chatId")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    role: varchar("role").notNull(),
    parts: json("parts").notNull(),
    attachments: json("attachments").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => [
    index("idx_message_chat").on(table.chatId),
    index("idx_message_chat_created").on(table.chatId, table.createdAt),
  ],
);

export type DBMessage = InferSelectModel<typeof message>;

export const stream = pgTable("Stream", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: text("chatId")
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull(),
});

export type Stream = InferSelectModel<typeof stream>;

export const agentRun = pgTable(
  "AgentRun",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: text("chatId")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: uuid("projectId").references(() => project.id, {
      onDelete: "set null",
    }),
    parentRunId: uuid("parentRunId"),
    rootRunId: uuid("rootRunId"),
    triggerMessageId: text("triggerMessageId"),
    agentKind: varchar("agentKind", { length: 32 }).notNull().default("chat"),
    agentName: varchar("agentName", { length: 128 }),
    model: varchar("model", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("running"),
    finishReason: varchar("finishReason", { length: 64 }),
    webSearchEnabled: boolean("webSearchEnabled").notNull().default(false),
    isReasoning: boolean("isReasoning").notNull().default(false),
    messageCount: integer("messageCount").notNull().default(0),
    promptTokens: integer("promptTokens").notNull().default(0),
    completionTokens: integer("completionTokens").notNull().default(0),
    totalTokens: integer("totalTokens").notNull().default(0),
    credits: integer("credits").notNull().default(0),
    cost: decimal("cost", { precision: 10, scale: 6 }),
    metadata: jsonb("metadata").notNull().default("{}"),
    startedAt: timestamp("startedAt").notNull(),
    finishedAt: timestamp("finishedAt"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [
    index("idx_agent_run_chat_started").on(table.chatId, table.startedAt),
    index("idx_agent_run_user_started").on(table.userId, table.startedAt),
    index("idx_agent_run_status").on(table.status),
    index("idx_agent_run_root").on(table.rootRunId),
    index("idx_agent_run_parent").on(table.parentRunId),
  ],
);

export type AgentRun = InferSelectModel<typeof agentRun>;

export const toolCall = pgTable(
  "ToolCall",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    runId: uuid("runId")
      .notNull()
      .references(() => agentRun.id, { onDelete: "cascade" }),
    chatId: text("chatId")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    messageId: text("messageId"),
    toolCallId: text("toolCallId").notNull(),
    toolName: varchar("toolName", { length: 128 }).notNull(),
    state: varchar("state", { length: 32 }).notNull(),
    input: jsonb("input"),
    output: jsonb("output"),
    errorText: text("errorText"),
    metadata: jsonb("metadata").notNull().default("{}"),
    startedAt: timestamp("startedAt").notNull(),
    finishedAt: timestamp("finishedAt"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("uniq_tool_call_run_call").on(table.runId, table.toolCallId),
    index("idx_tool_call_run").on(table.runId),
    index("idx_tool_call_chat").on(table.chatId),
    index("idx_tool_call_name").on(table.toolName),
  ],
);

export type ToolCall = InferSelectModel<typeof toolCall>;

export const artifact = pgTable("Artifact", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: text("chatId")
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  index: varchar("index", { length: 16 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  language: varchar("language", { length: 32 }).notNull(),
  code: text("code").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type Artifact = InferSelectModel<typeof artifact>;

export const feedback = pgTable(
  "Feedback",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    category: varchar("category", { length: 64 }),
    title: varchar("title", { length: 256 }).notNull(),
    content: text("content").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    priority: varchar("priority", { length: 32 }).default("medium"),
    metadata: json("metadata"),
    attachments: json("attachments").default("[]"),
    adminResponse: text("adminResponse"),
    respondedBy: uuid("respondedBy").references(() => user.id),
    respondedAt: timestamp("respondedAt"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [
    index("idx_feedback_user").on(table.userId),
    index("idx_feedback_status").on(table.status),
    index("idx_feedback_user_created").on(table.userId, table.createdAt),
  ],
);

export type Feedback = InferSelectModel<typeof feedback>;

export const versionUpdate = pgTable(
  "VersionUpdate",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    version: varchar("version", { length: 32 }).notNull().unique(),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 32 }).notNull(),
    features: json("features").default("[]"),
    improvements: json("improvements").default("[]"),
    bugFixes: json("bugFixes").default("[]"),
    breaking: json("breaking").default("[]"),
    highlights: json("highlights").default("[]"),
    migration: text("migration"),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    isLatest: boolean("isLatest").notNull().default(false),
    publishedBy: uuid("publishedBy").references(() => user.id),
    downloadUrl: text("downloadUrl"),
    docsUrl: text("docsUrl"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    publishedAt: timestamp("publishedAt"),
  },
  (table) => [
    index("idx_version_status").on(table.status),
    index("idx_version_latest").on(table.isLatest),
  ],
);

export type VersionUpdate = InferSelectModel<typeof versionUpdate>;

export const memory = pgTable(
  "Memory",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    memory: text("memory").notNull(),
    category: varchar("category", { length: 64 }),
    metadata: json("metadata"),
    hash: varchar("hash", { length: 64 }),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    lastAccessedAt: timestamp("lastAccessedAt"),
  },
  (table) => [
    index("idx_memory_user").on(table.userId),
    index("idx_memory_user_hash").on(table.userId, table.hash),
  ],
);

export type Memory = InferSelectModel<typeof memory>;

export const adminSession = pgTable(
  "AdminSession",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("userAgent"),
  },
  (table) => [
    index("idx_admin_session_token").on(table.token),
    index("idx_admin_session_user").on(table.userId),
  ],
);

export type AdminSession = InferSelectModel<typeof adminSession>;

export const auditLog = pgTable(
  "AuditLog",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId").references(() => user.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(),
    resource: varchar("resource", { length: 64 }).notNull(),
    resourceId: text("resourceId"),
    details: json("details"),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => [
    index("idx_audit_log_user").on(table.userId),
    index("idx_audit_log_created").on(table.createdAt),
  ],
);

export type AuditLog = InferSelectModel<typeof auditLog>;

export const systemConfig = pgTable("SystemConfig", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: json("value").notNull(),
  description: text("description"),
  updatedBy: uuid("updatedBy").references(() => user.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type SystemConfig = InferSelectModel<typeof systemConfig>;

export const aiUsageLog = pgTable(
  "AIUsageLog",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId").references(() => user.id, { onDelete: "set null" }),
    chatId: text("chatId").references(() => chat.id, { onDelete: "set null" }),
    model: varchar("model", { length: 64 }).notNull(),
    promptTokens: integer("promptTokens").notNull().default(0),
    completionTokens: integer("completionTokens").notNull().default(0),
    totalTokens: integer("totalTokens").notNull().default(0),
    cost: decimal("cost", { precision: 10, scale: 6 }),
    latency: integer("latency"),
    status: varchar("status", { length: 32 }),
    error: text("error"),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => [
    index("idx_ai_usage_user").on(table.userId),
    index("idx_ai_usage_created").on(table.createdAt),
  ],
);

export type AIUsageLog = InferSelectModel<typeof aiUsageLog>;

export const notification = pgTable(
  "Notification",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId").references(() => user.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    content: text("content"),
    isRead: boolean("isRead").default(false),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => [index("idx_notification_user").on(table.userId)],
);

export type Notification = InferSelectModel<typeof notification>;
