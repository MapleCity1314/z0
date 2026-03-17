CREATE TABLE "Memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"memory" text NOT NULL,
	"category" varchar(64),
	"metadata" json,
	"hash" varchar(64),
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"lastAccessedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;