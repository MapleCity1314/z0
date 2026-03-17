import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  if (!dbInstance) {
    const client = postgres(connectionString);
    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}

export type BackendDb = ReturnType<typeof getDb>;
