import { and, eq, gt } from "drizzle-orm";
import { getSessionCookie } from "better-auth/cookies";
import { getDb, session, user } from "@z0/db";

export type SessionActor = {
  userId: string;
  role: string;
};

export async function resolveSessionActor(
  headers: Headers,
): Promise<SessionActor | null> {
  const token = getSessionCookie(headers);
  if (!token) {
    return null;
  }

  const db = getDb();
  const now = new Date();

  const [record] = await db
    .select({
      userId: user.id,
      role: user.role,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(and(eq(session.token, token), gt(session.expiresAt, now)))
    .limit(1);

  if (!record?.userId) {
    return null;
  }

  return {
    userId: record.userId,
    role: record.role ?? "user",
  };
}
