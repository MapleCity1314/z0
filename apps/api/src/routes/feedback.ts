import type { Hono } from "hono";
import { requireActor, requireAdmin } from "../actor";
import { jsonResult } from "../http";
import type { AppServices } from "../services";

export function registerFeedbackRoutes(app: Hono, services: AppServices) {
  app.get("/v1/feedback", async (c) => {
    const actor = await requireActor(c);
    return jsonResult(c, await services.feedbackService.getMine(actor.userId));
  });

  app.post("/v1/feedback", async (c) => {
    const actor = await requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.feedbackService.submit({
        userId: actor.userId,
        type: body.type,
        category: body.category,
        title: body.title,
        content: body.content,
        priority: body.priority,
        metadata: body.metadata,
        attachments: body.attachments,
      }),
      201,
    );
  });

  app.get("/v1/feedback/:id", async (c) => {
    const actor = await requireActor(c);
    return jsonResult(
      c,
      await services.feedbackService.getOne(actor.userId, c.req.param("id")),
    );
  });

  app.delete("/v1/feedback/:id", async (c) => {
    const actor = await requireActor(c);
    return jsonResult(
      c,
      await services.feedbackService.remove(actor.userId, c.req.param("id")),
    );
  });

  app.get("/v1/admin/feedback", async (c) => {
    await requireAdmin(c);
    return jsonResult(
      c,
      await services.feedbackService.listAll({
        type: c.req.query("type"),
        status: c.req.query("status"),
        priority: c.req.query("priority"),
      }),
    );
  });

  app.get("/v1/admin/feedback/stats", async (c) => {
    await requireAdmin(c);
    return c.json({ data: await services.adminService.getFeedbackStats() });
  });

  app.get("/v1/admin/feedback/:id", async (c) => {
    await requireAdmin(c);
    const feedbackDetail = await services.adminService.getFeedbackDetail(
      c.req.param("id"),
    );
    if (!feedbackDetail) {
      return c.json(
        {
          error: { code: "feedback_not_found", message: "Feedback not found" },
        },
        404,
      );
    }
    return c.json({ data: feedbackDetail });
  });

  app.patch("/v1/admin/feedback/:id/status", async (c) => {
    await requireAdmin(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.feedbackService.updateStatus(
        c.req.param("id"),
        body.status,
      ),
    );
  });

  app.post("/v1/admin/feedback/:id/respond", async (c) => {
    const actor = await requireAdmin(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.feedbackService.respond(
        c.req.param("id"),
        actor.userId,
        body.response,
      ),
    );
  });
}
