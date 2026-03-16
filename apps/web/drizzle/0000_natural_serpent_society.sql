CREATE TABLE "Artifact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" text NOT NULL,
	"index" varchar(16) NOT NULL,
	"title" varchar(256) NOT NULL,
	"language" varchar(32) NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Chat" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp NOT NULL,
	"title" text NOT NULL,
	"userId" uuid NOT NULL,
	"projectId" uuid
);
--> statement-breakpoint
CREATE TABLE "Feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"category" varchar(64),
	"title" varchar(256) NOT NULL,
	"content" text NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"priority" varchar(32) DEFAULT 'medium',
	"metadata" json,
	"attachments" json DEFAULT '[]',
	"adminResponse" text,
	"respondedBy" uuid,
	"respondedAt" timestamp,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"chatId" text NOT NULL,
	"role" varchar NOT NULL,
	"parts" json NOT NULL,
	"attachments" json NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"type" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"visibility" varchar(32) DEFAULT 'private' NOT NULL,
	"files" json DEFAULT '{}' NOT NULL,
	"buildConfig" json,
	"deploymentUrl" text,
	"deploymentProvider" varchar(64),
	"tags" json DEFAULT '[]',
	"likes" json DEFAULT '0',
	"views" json DEFAULT '0',
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"publishedAt" timestamp,
	"lastDeployedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "Stream" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" text NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"avatar" text,
	"email" varchar(64) NOT NULL,
	"password" varchar(64) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "VersionUpdate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(32) NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"type" varchar(32) NOT NULL,
	"features" json DEFAULT '[]',
	"improvements" json DEFAULT '[]',
	"bugFixes" json DEFAULT '[]',
	"breaking" json DEFAULT '[]',
	"highlights" json DEFAULT '[]',
	"migration" text,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"isLatest" varchar(8) DEFAULT 'false',
	"publishedBy" uuid,
	"downloadUrl" text,
	"docsUrl" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"publishedAt" timestamp,
	CONSTRAINT "VersionUpdate_version_unique" UNIQUE("version")
);
--> statement-breakpoint
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_respondedBy_User_id_fk" FOREIGN KEY ("respondedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VersionUpdate" ADD CONSTRAINT "VersionUpdate_publishedBy_User_id_fk" FOREIGN KEY ("publishedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;