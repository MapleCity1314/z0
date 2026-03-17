import type { Hono } from "hono";
import { requireActor } from "../actor";
import { jsonResult } from "../http";
import type { AppServices } from "../services";

export function registerProjectRoutes(app: Hono, services: AppServices) {
  app.get("/v1/projects", async (c) => {
    const actor = await requireActor(c);
    return jsonResult(
      c,
      await services.projectsService.listByUser(actor.userId),
    );
  });

  app.get("/v1/projects/public", async (c) => {
    const limit = Number(c.req.query("limit") ?? "50");
    return jsonResult(c, await services.projectsService.listPublic(limit));
  });

  app.post("/v1/projects", async (c) => {
    const actor = await requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.projectsService.create({
        userId: actor.userId,
        name: body.name,
        description: body.description,
        type: body.type,
        visibility: body.visibility,
      }),
      201,
    );
  });

  app.get("/v1/projects/:id", async (c) => {
    const actor = await requireActor(c);
    return jsonResult(
      c,
      await services.projectsService.getById(actor.userId, c.req.param("id")),
    );
  });

  app.patch("/v1/projects/:id/files", async (c) => {
    const actor = await requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.projectsService.updateFiles({
        actorUserId: actor.userId,
        projectId: c.req.param("id"),
        files: body.files ?? {},
      }),
    );
  });

  app.patch("/v1/projects/:id/metadata", async (c) => {
    const actor = await requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.projectsService.updateMetadata({
        actorUserId: actor.userId,
        projectId: c.req.param("id"),
        name: body.name,
        description: body.description,
        tags: body.tags,
      }),
    );
  });

  app.post("/v1/projects/:id/deploy", async (c) => {
    const actor = await requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.projectsService.deploy({
        actorUserId: actor.userId,
        projectId: c.req.param("id"),
        deploymentUrl: body.deploymentUrl,
        provider: body.provider,
      }),
    );
  });

  app.post("/v1/projects/:id/publish", async (c) => {
    const actor = await requireActor(c);
    return jsonResult(
      c,
      await services.projectsService.publish(actor.userId, c.req.param("id")),
    );
  });

  app.post("/v1/projects/:id/unpublish", async (c) => {
    const actor = await requireActor(c);
    return jsonResult(
      c,
      await services.projectsService.unpublish(actor.userId, c.req.param("id")),
    );
  });

  app.delete("/v1/projects/:id", async (c) => {
    const actor = await requireActor(c);
    return jsonResult(
      c,
      await services.projectsService.remove(actor.userId, c.req.param("id")),
    );
  });
}
