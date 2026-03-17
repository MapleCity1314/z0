import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "../db/client";

function createPlaceholderPassword() {
  return crypto.randomUUID();
}

export function createAuth() {
  const db = getDb();

  return betterAuth({
    appName: "z0",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: {
          modelName: "User",
          fields: {
            image: "avatar",
            emailVerified: "emailVerified",
          },
        },
        session: {
          modelName: "Session",
        },
        account: {
          modelName: "Account",
        },
        verification: {
          modelName: "Verification",
        },
      },
    }),
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID ?? "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          input: false,
          defaultValue: "user",
        },
        status: {
          type: "string",
          input: false,
          defaultValue: "active",
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            return {
              data: {
                ...user,
                password: createPlaceholderPassword(),
                updatedAt: new Date(),
              },
            };
          },
        },
      },
    },
    plugins: [nextCookies()],
    trustedOrigins: [
      process.env.BETTER_AUTH_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.API_BASE_URL,
    ].filter((value): value is string => Boolean(value)),
  });
}
