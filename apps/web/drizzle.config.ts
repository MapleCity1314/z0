import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../../packages/backend/src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://murde@localhost:5432/z0-assistant",
  },
});
