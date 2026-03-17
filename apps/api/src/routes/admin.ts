import type { Hono } from "hono";
import { requireAdmin } from "../actor";
import type { AppServices } from "../services";

export function registerAdminRoutes(app: Hono, services: AppServices) {
  app.get("/v1/admin/dashboard", async (c) => {
    await requireAdmin(c);
    return c.json({ data: await services.adminService.getDashboardStats() });
  });

  app.get("/v1/admin/dashboard/activity", async (c) => {
    await requireAdmin(c);
    return c.json({ data: await services.adminService.getDashboardActivity() });
  });

  app.get("/v1/admin/users", async (c) => {
    await requireAdmin(c);
    return c.json({
      data: await services.adminService.listUsers(
        Number(c.req.query("page") ?? "1"),
        Number(c.req.query("limit") ?? "20"),
      ),
    });
  });

  app.get("/v1/admin/users/:id", async (c) => {
    await requireAdmin(c);
    const userDetail = await services.adminService.getUserDetail(
      c.req.param("id"),
    );
    if (!userDetail) {
      return c.json(
        { error: { code: "user_not_found", message: "User not found" } },
        404,
      );
    }
    return c.json({ data: userDetail });
  });

  app.get("/v1/admin/projects", async (c) => {
    await requireAdmin(c);
    return c.json({
      data: await services.adminService.listProjects({
        page: Number(c.req.query("page") ?? "1"),
        limit: Number(c.req.query("limit") ?? "20"),
        type: c.req.query("type"),
        status: c.req.query("status"),
        visibility: c.req.query("visibility"),
      }),
    });
  });

  app.get("/v1/admin/projects/:id", async (c) => {
    await requireAdmin(c);
    const projectDetail = await services.adminService.getProjectDetail(
      c.req.param("id"),
    );
    if (!projectDetail) {
      return c.json(
        { error: { code: "project_not_found", message: "Project not found" } },
        404,
      );
    }
    return c.json({ data: projectDetail });
  });

  app.get("/v1/admin/chats", async (c) => {
    await requireAdmin(c);
    return c.json({
      data: await services.adminService.listChats({
        page: Number(c.req.query("page") ?? "1"),
        limit: Number(c.req.query("limit") ?? "20"),
        userId: c.req.query("userId"),
      }),
    });
  });

  app.get("/v1/admin/chats/:id", async (c) => {
    await requireAdmin(c);
    const chatDetail = await services.adminService.getChatDetail(
      c.req.param("id"),
    );
    if (!chatDetail) {
      return c.json(
        { error: { code: "chat_not_found", message: "Chat not found" } },
        404,
      );
    }
    return c.json({ data: chatDetail });
  });
}
