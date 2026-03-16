CREATE TABLE "AdminSession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"token" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp NOT NULL,
	"ip" varchar(64),
	"userAgent" text,
	CONSTRAINT "AdminSession_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "AIUsageLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"chatId" text,
	"model" varchar(64) NOT NULL,
	"promptTokens" integer DEFAULT 0 NOT NULL,
	"completionTokens" integer DEFAULT 0 NOT NULL,
	"totalTokens" integer DEFAULT 0 NOT NULL,
	"cost" numeric(10, 6),
	"latency" integer,
	"status" varchar(32),
	"error" text,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuditLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"action" varchar(64) NOT NULL,
	"resource" varchar(64) NOT NULL,
	"resourceId" text,
	"details" json,
	"ip" varchar(64),
	"userAgent" text,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"type" varchar(32) NOT NULL,
	"title" varchar(256) NOT NULL,
	"content" text,
	"isRead" boolean DEFAULT false,
	"metadata" json,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SystemConfig" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(128) NOT NULL,
	"value" json NOT NULL,
	"description" text,
	"updatedBy" uuid,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "SystemConfig_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "role" varchar(32) DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "status" varchar(32) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "lastLoginAt" timestamp;--> statement-breakpoint
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_updatedBy_User_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_session_token" ON "AdminSession" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_admin_session_user" ON "AdminSession" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_user" ON "AIUsageLog" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_created" ON "AIUsageLog" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_audit_log_user" ON "AuditLog" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created" ON "AuditLog" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_notification_user" ON "Notification" USING btree ("userId");
