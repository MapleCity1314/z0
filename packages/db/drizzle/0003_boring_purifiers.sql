CREATE TABLE "ChatMCPServer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" text NOT NULL,
	"userMcpServerId" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ChatSkill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" text NOT NULL,
	"userSkillId" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MCPServer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"endpoint" text NOT NULL,
	"sourceType" varchar(32) DEFAULT 'external' NOT NULL,
	"metadata" json DEFAULT '{}',
	"isActive" boolean DEFAULT true NOT NULL,
	"createdBy" uuid,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Skill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"directory" text NOT NULL,
	"sourceType" varchar(32) DEFAULT 'external' NOT NULL,
	"metadata" json DEFAULT '{}',
	"isActive" boolean DEFAULT true NOT NULL,
	"createdBy" uuid,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserMCPServer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"mcpServerId" uuid NOT NULL,
	"useByDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserSkill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"skillId" uuid NOT NULL,
	"useByDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ChatMCPServer" ADD CONSTRAINT "ChatMCPServer_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChatMCPServer" ADD CONSTRAINT "ChatMCPServer_userMcpServerId_UserMCPServer_id_fk" FOREIGN KEY ("userMcpServerId") REFERENCES "public"."UserMCPServer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChatSkill" ADD CONSTRAINT "ChatSkill_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChatSkill" ADD CONSTRAINT "ChatSkill_userSkillId_UserSkill_id_fk" FOREIGN KEY ("userSkillId") REFERENCES "public"."UserSkill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MCPServer" ADD CONSTRAINT "MCPServer_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserMCPServer" ADD CONSTRAINT "UserMCPServer_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserMCPServer" ADD CONSTRAINT "UserMCPServer_mcpServerId_MCPServer_id_fk" FOREIGN KEY ("mcpServerId") REFERENCES "public"."MCPServer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_Skill_id_fk" FOREIGN KEY ("skillId") REFERENCES "public"."Skill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_chat_mcp_link" ON "ChatMCPServer" USING btree ("chatId","userMcpServerId");--> statement-breakpoint
CREATE INDEX "idx_chat_mcp_chat" ON "ChatMCPServer" USING btree ("chatId");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_chat_skill_link" ON "ChatSkill" USING btree ("chatId","userSkillId");--> statement-breakpoint
CREATE INDEX "idx_chat_skill_chat" ON "ChatSkill" USING btree ("chatId");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_mcp_server_endpoint" ON "MCPServer" USING btree ("endpoint");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_skill_name_directory" ON "Skill" USING btree ("name","directory");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_mcp_server" ON "UserMCPServer" USING btree ("userId","mcpServerId");--> statement-breakpoint
CREATE INDEX "idx_user_mcp_server_user" ON "UserMCPServer" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_skill" ON "UserSkill" USING btree ("userId","skillId");--> statement-breakpoint
CREATE INDEX "idx_user_skill_user" ON "UserSkill" USING btree ("userId");