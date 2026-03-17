import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";

export type ApiActor = {
  userId: string;
  role: string;
};

export function requireActor(c: Context): ApiActor {
  const userId = c.req.header("x-user-id");
  const role = c.req.header("x-user-role") ?? "user";

  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  return { userId, role };
}

export function requireAdmin(c: Context): ApiActor {
  const actor = requireActor(c);
  if (actor.role !== "admin") {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  return actor;
}
