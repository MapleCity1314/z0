import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  json,
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
  ],
);

export type Chat = InferSelectModel<typeof chat>;

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
  (table) => [index("idx_message_chat").on(table.chatId)],
);

export type DBMessage = InferSelectModel<typeof message>;

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
  (table) => [index("idx_memory_user").on(table.userId)],
);

export type Memory = InferSelectModel<typeof memory>;
