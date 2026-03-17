import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  AdminService,
  FeedbackService,
  ProjectsService,
  UsersService,
  VersionsService,
} from "@z0/backend";
import type { HealthcheckPayload } from "@z0/shared-types";
import { requireActor, requireAdmin } from "./actor";
import { getEnv } from "./env";
import { jsonResult } from "./http";
import {
  DrizzleAdminRepository,
  DrizzleFeedbackRepository,
  DrizzleProjectsRepository,
  DrizzleUsersRepository,
  DrizzleVersionsRepository,
} from "./repositories";

type AppServices = {
  adminService: AdminService;
  feedbackService: FeedbackService;
  projectsService: ProjectsService;
  usersService: UsersService;
  versionsService: VersionsService;
};

function createServices(): AppServices {
  return {
    projectsService: new ProjectsService(new DrizzleProjectsRepository()),
    feedbackService: new FeedbackService(new DrizzleFeedbackRepository()),
    versionsService: new VersionsService(new DrizzleVersionsRepository()),
    usersService: new UsersService(new DrizzleUsersRepository()),
    adminService: new AdminService(new DrizzleAdminRepository()),
  };
}

export function createApp(overrides: Partial<AppServices> = {}) {
  const defaults = overrides.adminService &&
    overrides.feedbackService &&
    overrides.projectsService &&
    overrides.usersService &&
    overrides.versionsService
    ? null
    : createServices();

  const adminService = overrides.adminService ?? defaults?.adminService;
  const feedbackService = overrides.feedbackService ?? defaults?.feedbackService;
  const projectsService = overrides.projectsService ?? defaults?.projectsService;
  const usersService = overrides.usersService ?? defaults?.usersService;
  const versionsService = overrides.versionsService ?? defaults?.versionsService;

  if (!adminService || !feedbackService || !projectsService || !usersService || !versionsService) {
    throw new Error("API services are not configured");
  }

  const app = new Hono();

  app.use("/*", cors());

  app.get("/", (c) => {
    return c.json({
      ok: true,
      service: getEnv().API_NAME,
      timestamp: new Date().toISOString(),
      version: getEnv().API_VERSION,
    } satisfies HealthcheckPayload);
  });

  app.get("/health", (c) => {
    return c.json({
      ok: true,
      service: getEnv().API_NAME,
      timestamp: new Date().toISOString(),
      version: getEnv().API_VERSION,
    } satisfies HealthcheckPayload);
  });

  app.get("/v1/users/me", async (c) => {
    const actor = requireActor(c);
    return jsonResult(c, await usersService.getProfile(actor.userId));
  });

  app.patch("/v1/users/me", async (c) => {
    const actor = requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await usersService.updateProfile({
        userId: actor.userId,
        name: body.name,
        avatar: body.avatar,
      }),
    );
  });

  app.get("/v1/projects", async (c) => {
    const actor = requireActor(c);
    return jsonResult(c, await projectsService.listByUser(actor.userId));
  });

  app.get("/v1/projects/public", async (c) => {
    const limit = Number(c.req.query("limit") ?? "50");
    return jsonResult(c, await projectsService.listPublic(limit));
  });

  app.post("/v1/projects", async (c) => {
    const actor = requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await projectsService.create({
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
    const actor = requireActor(c);
    return jsonResult(c, await projectsService.getById(actor.userId, c.req.param("id")));
  });

  app.patch("/v1/projects/:id/files", async (c) => {
    const actor = requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await projectsService.updateFiles({
        actorUserId: actor.userId,
        projectId: c.req.param("id"),
        files: body.files ?? {},
      }),
    );
  });

  app.patch("/v1/projects/:id/metadata", async (c) => {
    const actor = requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await projectsService.updateMetadata({
        actorUserId: actor.userId,
        projectId: c.req.param("id"),
        name: body.name,
        description: body.description,
        tags: body.tags,
      }),
    );
  });

  app.post("/v1/projects/:id/deploy", async (c) => {
    const actor = requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await projectsService.deploy({
        actorUserId: actor.userId,
        projectId: c.req.param("id"),
        deploymentUrl: body.deploymentUrl,
        provider: body.provider,
      }),
    );
  });

  app.post("/v1/projects/:id/publish", async (c) => {
    const actor = requireActor(c);
    return jsonResult(c, await projectsService.publish(actor.userId, c.req.param("id")));
  });

  app.post("/v1/projects/:id/unpublish", async (c) => {
    const actor = requireActor(c);
    return jsonResult(c, await projectsService.unpublish(actor.userId, c.req.param("id")));
  });

  app.delete("/v1/projects/:id", async (c) => {
    const actor = requireActor(c);
    return jsonResult(c, await projectsService.remove(actor.userId, c.req.param("id")));
  });

  app.get("/v1/feedback", async (c) => {
    const actor = requireActor(c);
    return jsonResult(c, await feedbackService.getMine(actor.userId));
  });

  app.post("/v1/feedback", async (c) => {
    const actor = requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await feedbackService.submit({
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
    const actor = requireActor(c);
    return jsonResult(c, await feedbackService.getOne(actor.userId, c.req.param("id")));
  });

  app.delete("/v1/feedback/:id", async (c) => {
    const actor = requireActor(c);
    return jsonResult(c, await feedbackService.remove(actor.userId, c.req.param("id")));
  });

  app.get("/v1/versions/latest", async (c) => {
    return jsonResult(c, await versionsService.getLatest());
  });

  app.get("/v1/versions/published", async (c) => {
    const limit = Number(c.req.query("limit") ?? "50");
    return jsonResult(c, await versionsService.listPublished(limit));
  });

  app.get("/v1/versions/:version", async (c) => {
    return jsonResult(c, await versionsService.getByNumber(c.req.param("version")));
  });

  app.get("/v1/admin/dashboard", async (c) => {
    requireAdmin(c);
    return c.json({ data: await adminService.getDashboardStats() });
  });

  app.get("/v1/admin/dashboard/activity", async (c) => {
    requireAdmin(c);
    return c.json({ data: await adminService.getDashboardActivity() });
  });

  app.get("/v1/admin/users", async (c) => {
    requireAdmin(c);
    return c.json({
      data: await adminService.listUsers(
        Number(c.req.query("page") ?? "1"),
        Number(c.req.query("limit") ?? "20"),
      ),
    });
  });

  app.get("/v1/admin/users/:id", async (c) => {
    requireAdmin(c);
    const userDetail = await adminService.getUserDetail(c.req.param("id"));
    if (!userDetail) {
      return c.json({ error: { code: "user_not_found", message: "User not found" } }, 404);
    }
    return c.json({ data: userDetail });
  });

  app.get("/v1/admin/projects", async (c) => {
    requireAdmin(c);
    return c.json({
      data: await adminService.listProjects({
        page: Number(c.req.query("page") ?? "1"),
        limit: Number(c.req.query("limit") ?? "20"),
        type: c.req.query("type"),
        status: c.req.query("status"),
        visibility: c.req.query("visibility"),
      }),
    });
  });

  app.get("/v1/admin/projects/:id", async (c) => {
    requireAdmin(c);
    const projectDetail = await adminService.getProjectDetail(c.req.param("id"));
    if (!projectDetail) {
      return c.json({ error: { code: "project_not_found", message: "Project not found" } }, 404);
    }
    return c.json({ data: projectDetail });
  });

  app.get("/v1/admin/chats", async (c) => {
    requireAdmin(c);
    return c.json({
      data: await adminService.listChats({
        page: Number(c.req.query("page") ?? "1"),
        limit: Number(c.req.query("limit") ?? "20"),
        userId: c.req.query("userId"),
      }),
    });
  });

  app.get("/v1/admin/chats/:id", async (c) => {
    requireAdmin(c);
    const chatDetail = await adminService.getChatDetail(c.req.param("id"));
    if (!chatDetail) {
      return c.json({ error: { code: "chat_not_found", message: "Chat not found" } }, 404);
    }
    return c.json({ data: chatDetail });
  });

  app.get("/v1/admin/feedback", async (c) => {
    requireAdmin(c);
    return jsonResult(
      c,
      await feedbackService.listAll({
        type: c.req.query("type"),
        status: c.req.query("status"),
        priority: c.req.query("priority"),
      }),
    );
  });

  app.get("/v1/admin/feedback/stats", async (c) => {
    requireAdmin(c);
    return c.json({ data: await adminService.getFeedbackStats() });
  });

  app.get("/v1/admin/feedback/:id", async (c) => {
    requireAdmin(c);
    const feedbackDetail = await adminService.getFeedbackDetail(c.req.param("id"));
    if (!feedbackDetail) {
      return c.json({ error: { code: "feedback_not_found", message: "Feedback not found" } }, 404);
    }
    return c.json({ data: feedbackDetail });
  });

  app.patch("/v1/admin/feedback/:id/status", async (c) => {
    requireAdmin(c);
    const body = await c.req.json();
    return jsonResult(c, await feedbackService.updateStatus(c.req.param("id"), body.status));
  });

  app.post("/v1/admin/feedback/:id/respond", async (c) => {
    const actor = requireAdmin(c);
    const body = await c.req.json();
    return jsonResult(c, await feedbackService.respond(c.req.param("id"), actor.userId, body.response));
  });

  app.get("/v1/admin/versions", async (c) => {
    requireAdmin(c);
    return jsonResult(c, await versionsService.listAll());
  });

  app.get("/v1/admin/versions/:id", async (c) => {
    requireAdmin(c);
    return jsonResult(c, await versionsService.getById(c.req.param("id")));
  });

  app.post("/v1/admin/versions", async (c) => {
    const actor = requireAdmin(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await versionsService.create({
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
    const actor = requireAdmin(c);
    return jsonResult(c, await versionsService.publish(c.req.param("id"), actor.userId));
  });

  app.patch("/v1/admin/versions/:id", async (c) => {
    requireAdmin(c);
    const body = await c.req.json();
    return jsonResult(c, await versionsService.update(c.req.param("id"), body));
  });

  app.post("/v1/admin/versions/:id/archive", async (c) => {
    requireAdmin(c);
    return jsonResult(c, await versionsService.archive(c.req.param("id")));
  });

  app.delete("/v1/admin/versions/:id", async (c) => {
    requireAdmin(c);
    return jsonResult(c, await versionsService.remove(c.req.param("id")));
  });

  return app;
}

export const app = createApp();
