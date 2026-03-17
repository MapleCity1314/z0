CREATE TABLE "AgentRun" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" text NOT NULL,
	"userId" uuid NOT NULL,
	"projectId" uuid,
	"parentRunId" uuid,
	"triggerMessageId" text,
	"agentKind" varchar(32) DEFAULT 'chat' NOT NULL,
	"agentName" varchar(128),
	"model" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'running' NOT NULL,
	"finishReason" varchar(64),
	"webSearchEnabled" boolean DEFAULT false NOT NULL,
	"isReasoning" boolean DEFAULT false NOT NULL,
	"messageCount" integer DEFAULT 0 NOT NULL,
	"promptTokens" integer DEFAULT 0 NOT NULL,
	"completionTokens" integer DEFAULT 0 NOT NULL,
	"totalTokens" integer DEFAULT 0 NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"cost" numeric(10, 6),
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"startedAt" timestamp NOT NULL,
	"finishedAt" timestamp,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ToolCall" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"runId" uuid NOT NULL,
	"chatId" text NOT NULL,
	"messageId" text,
	"toolCallId" text NOT NULL,
	"toolName" varchar(128) NOT NULL,
	"state" varchar(32) NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"errorText" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"startedAt" timestamp NOT NULL,
	"finishedAt" timestamp,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ToolCall" ADD CONSTRAINT "ToolCall_runId_AgentRun_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."AgentRun"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ToolCall" ADD CONSTRAINT "ToolCall_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_run_chat_started" ON "AgentRun" USING btree ("chatId","startedAt");--> statement-breakpoint
CREATE INDEX "idx_agent_run_user_started" ON "AgentRun" USING btree ("userId","startedAt");--> statement-breakpoint
CREATE INDEX "idx_agent_run_status" ON "AgentRun" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tool_call_run_call" ON "ToolCall" USING btree ("runId","toolCallId");--> statement-breakpoint
CREATE INDEX "idx_tool_call_run" ON "ToolCall" USING btree ("runId");--> statement-breakpoint
CREATE INDEX "idx_tool_call_chat" ON "ToolCall" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX "idx_tool_call_name" ON "ToolCall" USING btree ("toolName");