import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 64 }).notNull(),
  avatar: text("avatar"),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }).notNull(),
  role: varchar("role", { length: 32 }).default("user"), // "user", "admin", "moderator"
  status: varchar("status", { length: 32 }).default("active"), // "active", "inactive", "banned"
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: text("id").primaryKey().notNull(), // Changed from uuid to text to support nanoid
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  projectId: uuid("projectId").references(() => project.id, {
    onDelete: "set null",
  }),
});

export type Chat = InferSelectModel<typeof chat>;

export const mcpServer = pgTable(
  "MCPServer",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: varchar("name", { length: 128 }).notNull(),
    endpoint: text("endpoint").notNull(),
    sourceType: varchar("sourceType", { length: 32 })
      .notNull()
      .default("external"), // "system", "market", "external"
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
      .default("external"), // "system", "market", "external"
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

export const message = pgTable("messages", {
  id: text("id").primaryKey().notNull(), // Changed from uuid to text to support nanoid
  chatId: text("chatId") // Changed from uuid to text to match chat.id
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const stream = pgTable("Stream", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: text("chatId") // Changed from uuid to text to match chat.id
    .notNull()
    .references(() => chat.id),
  createdAt: timestamp("createdAt").notNull(),
});

export type Stream = InferSelectModel<typeof stream>;

export const artifact = pgTable("Artifact", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: text("chatId") // Changed from uuid to text to match chat.id
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  index: varchar("index", { length: 16 }).notNull(), // e.g., "A1", "A2"
  title: varchar("title", { length: 256 }).notNull(),
  language: varchar("language", { length: 32 }).notNull(),
  code: text("code").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type Artifact = InferSelectModel<typeof artifact>;

export const project = pgTable("Project", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 32 }).notNull(), // "vue", "react", "nextjs", "vanilla"
  status: varchar("status", { length: 32 }).notNull().default("draft"), // "draft", "building", "deployed", "failed"
  visibility: varchar("visibility", { length: 32 })
    .notNull()
    .default("private"), // "private", "public"

  // File structure stored as JSON
  files: json("files").notNull().default("{}"), // { "src/App.tsx": "content", ... }

  // Build and deployment info
  buildConfig: json("buildConfig"), // Build configuration (dependencies, scripts, etc.)
  deploymentUrl: text("deploymentUrl"), // Deployed URL if published
  deploymentProvider: varchar("deploymentProvider", { length: 64 }), // "vercel", "netlify", etc.

  // Metadata
  tags: json("tags").default("[]"), // ["ai-generated", "chat-app", etc.]
  likes: json("likes").default("0"), // Number of likes from community
  views: json("views").default("0"), // Number of views

  // Timestamps
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  publishedAt: timestamp("publishedAt"), // When made public
  lastDeployedAt: timestamp("lastDeployedAt"), // Last deployment time
});

export type Project = InferSelectModel<typeof project>;

export const feedback = pgTable("Feedback", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).notNull(), // "bug", "feature", "improvement", "other"
  category: varchar("category", { length: 64 }), // "ui", "performance", "ai", "deployment", etc.
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"), // "pending", "reviewing", "planned", "completed", "rejected"
  priority: varchar("priority", { length: 32 }).default("medium"), // "low", "medium", "high", "critical"

  // Additional context
  metadata: json("metadata"), // Browser info, screenshots, logs, etc.
  attachments: json("attachments").default("[]"), // File attachments

  // Admin response
  adminResponse: text("adminResponse"),
  respondedBy: uuid("respondedBy").references(() => user.id),
  respondedAt: timestamp("respondedAt"),

  // Timestamps
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type Feedback = InferSelectModel<typeof feedback>;

export const versionUpdate = pgTable("VersionUpdate", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  version: varchar("version", { length: 32 }).notNull().unique(), // "1.0.0", "1.1.0", etc.
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 32 }).notNull(), // "major", "minor", "patch"

  // Release notes organized by category
  features: json("features").default("[]"), // [{ title: "...", description: "..." }]
  improvements: json("improvements").default("[]"),
  bugFixes: json("bugFixes").default("[]"),
  breaking: json("breaking").default("[]"), // Breaking changes

  // Additional info
  highlights: json("highlights").default("[]"), // Key highlights for this version
  migration: text("migration"), // Migration guide if needed

  // Status
  status: varchar("status", { length: 32 }).notNull().default("draft"), // "draft", "published", "archived"
  isLatest: varchar("isLatest", { length: 8 }).default("false"), // "true" or "false" (only one can be true)

  // Metadata
  publishedBy: uuid("publishedBy").references(() => user.id),
  downloadUrl: text("downloadUrl"), // Download link if applicable
  docsUrl: text("docsUrl"), // Documentation URL

  // Timestamps
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  publishedAt: timestamp("publishedAt"),
});

export type VersionUpdate = InferSelectModel<typeof versionUpdate>;

export const memory = pgTable("Memory", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Memory content
  memory: text("memory").notNull(), // The actual memory text
  category: varchar("category", { length: 64 }), // "preference", "fact", "context", etc.

  // Memory metadata
  metadata: json("metadata"), // Additional context, source, confidence, etc.
  hash: varchar("hash", { length: 64 }), // Hash for deduplication

  // Timestamps
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  lastAccessedAt: timestamp("lastAccessedAt"), // Track when memory was last used
});

export type Memory = InferSelectModel<typeof memory>;

// Admin Session (separate authentication for admin panel)
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

// Audit Log
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

// System Config
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

// AI Usage Log
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

// Notification
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
