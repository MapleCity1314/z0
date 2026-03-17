import type { Hono } from "hono";
import { requireActor } from "../actor";
import { jsonResult } from "../http";
import type { AppServices } from "../services";

export function registerUserRoutes(app: Hono, services: AppServices) {
  app.get("/v1/users/me", async (c) => {
    const actor = requireActor(c);
    return jsonResult(c, await services.usersService.getProfile(actor.userId));
  });

  app.patch("/v1/users/me", async (c) => {
    const actor = requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.usersService.updateProfile({
        userId: actor.userId,
        name: body.name,
        avatar: body.avatar,
      }),
    );
  });
}
