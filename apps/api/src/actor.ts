import { HTTPException } from "hono/http-exception";
import { resolveSessionActor, verifyInternalAuthHeaders } from "@z0/backend";
import type { Context } from "hono";

export type ApiActor = {
  userId: string;
  role: string;
};

export async function requireActor(c: Context): Promise<ApiActor> {
  const sessionActor = await resolveSessionActor(c.req.raw.headers);
  if (sessionActor) {
    return sessionActor;
  }

  const internalActor = verifyInternalAuthHeaders(c.req.raw.headers, "web-api");
  if (internalActor) {
    return {
      userId: internalActor.userId,
      role: internalActor.role ?? "user",
    };
  }

  if (process.env.NODE_ENV === "test") {
    const userId = c.req.header("x-user-id");
    const role = c.req.header("x-user-role") ?? "user";
    if (userId) {
      return { userId, role };
    }
  }

  throw new HTTPException(401, { message: "Unauthorized" });
}

export async function requireAdmin(c: Context): Promise<ApiActor> {
  const actor = await requireActor(c);
  if (actor.role !== "admin") {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  return actor;
}
