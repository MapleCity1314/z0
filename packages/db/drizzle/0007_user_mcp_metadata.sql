ALTER TABLE "UserMCPServer"
ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
