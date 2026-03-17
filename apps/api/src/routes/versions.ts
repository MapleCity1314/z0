import type { Hono } from "hono";
import { requireAdmin } from "../actor";
import { jsonResult } from "../http";
import type { AppServices } from "../services";

export function registerVersionRoutes(app: Hono, services: AppServices) {
  app.get("/v1/versions/latest", async (c) => {
    return jsonResult(c, await services.versionsService.getLatest());
  });

  app.get("/v1/versions/published", async (c) => {
    const limit = Number(c.req.query("limit") ?? "50");
    return jsonResult(c, await services.versionsService.listPublished(limit));
  });

  app.get("/v1/versions/:version", async (c) => {
    return jsonResult(
      c,
      await services.versionsService.getByNumber(c.req.param("version")),
    );
  });

  app.get("/v1/admin/versions", async (c) => {
    await requireAdmin(c);
    return jsonResult(c, await services.versionsService.listAll());
  });

  app.get("/v1/admin/versions/:id", async (c) => {
    await requireAdmin(c);
    return jsonResult(
      c,
      await services.versionsService.getById(c.req.param("id")),
    );
  });

  app.post("/v1/admin/versions", async (c) => {
    const actor = await requireAdmin(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.versionsService.create({
        actorUserId: actor.userId,
        version: body.version,
        title: body.title,
        description: body.description,
        type: body.type,
        features: body.features,
        improvements: body.improvements,
        bugFixes: body.bugFixes,
        breaking: body.breaking,
        highlights: body.highlights,
        migration: body.migration,
        downloadUrl: body.downloadUrl,
        docsUrl: body.docsUrl,
      }),
      201,
    );
  });

  app.post("/v1/admin/versions/:id/publish", async (c) => {
    const actor = await requireAdmin(c);
    return jsonResult(
      c,
      await services.versionsService.publish(c.req.param("id"), actor.userId),
    );
  });

  app.patch("/v1/admin/versions/:id", async (c) => {
    await requireAdmin(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.versionsService.update(c.req.param("id"), body),
    );
  });

  app.post("/v1/admin/versions/:id/archive", async (c) => {
    await requireAdmin(c);
    return jsonResult(
      c,
      await services.versionsService.archive(c.req.param("id")),
    );
  });

  app.delete("/v1/admin/versions/:id", async (c) => {
    await requireAdmin(c);
    return jsonResult(
      c,
      await services.versionsService.remove(c.req.param("id")),
    );
  });
}
