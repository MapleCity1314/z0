CREATE TABLE "Account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"accountId" text NOT NULL,
	"providerId" varchar(64) NOT NULL,
	"userId" uuid NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" varchar(128),
	"userAgent" text,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_chatId_Chat_id_fk";
--> statement-breakpoint
ALTER TABLE "Stream" DROP CONSTRAINT "Stream_chatId_Chat_id_fk";
--> statement-breakpoint
ALTER TABLE "Project" ALTER COLUMN "likes" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Project" ALTER COLUMN "views" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Project" ALTER COLUMN "likes" SET DATA TYPE integer USING NULLIF(BTRIM("likes"::text, '"'), '')::integer;--> statement-breakpoint
ALTER TABLE "Project" ALTER COLUMN "likes" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Project" ALTER COLUMN "likes" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "Project" ALTER COLUMN "views" SET DATA TYPE integer USING NULLIF(BTRIM("views"::text, '"'), '')::integer;--> statement-breakpoint
ALTER TABLE "Project" ALTER COLUMN "views" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Project" ALTER COLUMN "views" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "email" SET DATA TYPE varchar(320);--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "password" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "VersionUpdate" ALTER COLUMN "isLatest" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "VersionUpdate" ALTER COLUMN "isLatest" SET DATA TYPE boolean USING CASE WHEN LOWER(COALESCE("isLatest", 'false')) IN ('true', 't', '1') THEN true ELSE false END;--> statement-breakpoint
ALTER TABLE "VersionUpdate" ALTER COLUMN "isLatest" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "VersionUpdate" ALTER COLUMN "isLatest" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "AgentRun" ADD COLUMN "rootRunId" uuid;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "emailVerified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_auth_provider_account" ON "Account" USING btree ("providerId","accountId");--> statement-breakpoint
CREATE INDEX "idx_auth_account_user" ON "Account" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_auth_session_token" ON "Session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_auth_session_user" ON "Session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_auth_verification_identifier" ON "Verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_run_root" ON "AgentRun" USING btree ("rootRunId");--> statement-breakpoint
CREATE INDEX "idx_agent_run_parent" ON "AgentRun" USING btree ("parentRunId");--> statement-breakpoint
CREATE INDEX "idx_chat_user" ON "Chat" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_chat_project" ON "Chat" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "idx_chat_user_created" ON "Chat" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_feedback_user" ON "Feedback" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_feedback_status" ON "Feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_feedback_user_created" ON "Feedback" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_memory_user" ON "Memory" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_memory_user_hash" ON "Memory" USING btree ("userId","hash");--> statement-breakpoint
CREATE INDEX "idx_message_chat" ON "messages" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX "idx_message_chat_created" ON "messages" USING btree ("chatId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_project_user" ON "Project" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_project_visibility" ON "Project" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_project_user_updated" ON "Project" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_email" ON "User" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_version_status" ON "VersionUpdate" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_version_latest" ON "VersionUpdate" USING btree ("isLatest");
