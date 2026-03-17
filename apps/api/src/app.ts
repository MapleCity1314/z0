import { Hono } from "hono";
import { cors } from "hono/cors";
import { registerAgentRoutes } from "./routes/agent";
import { registerAdminRoutes } from "./routes/admin";
import { registerFeedbackRoutes } from "./routes/feedback";
import { registerHealthRoutes } from "./routes/health";
import { registerProjectRoutes } from "./routes/projects";
import { registerUserRoutes } from "./routes/users";
import { registerVersionRoutes } from "./routes/versions";
import { createServices, type AppServices } from "./services";

export function createApp(overrides: Partial<AppServices> = {}) {
  const defaults =
    overrides.adminService &&
    overrides.feedbackService &&
    overrides.projectsService &&
    overrides.usersService &&
    overrides.versionsService
      ? null
      : createServices();

  const adminService = overrides.adminService ?? defaults?.adminService;
  const feedbackService =
    overrides.feedbackService ?? defaults?.feedbackService;
  const projectsService =
    overrides.projectsService ?? defaults?.projectsService;
  const usersService = overrides.usersService ?? defaults?.usersService;
  const versionsService =
    overrides.versionsService ?? defaults?.versionsService;

  if (
    !adminService ||
    !feedbackService ||
    !projectsService ||
    !usersService ||
    !versionsService
  ) {
    throw new Error("API services are not configured");
  }

  const resolvedServices: AppServices = {
    adminService,
    feedbackService,
    projectsService,
    usersService,
    versionsService,
  };

  const app = new Hono();

  app.use("/*", cors());

  registerHealthRoutes(app);
  registerAgentRoutes(app);
  registerUserRoutes(app, resolvedServices);
  registerProjectRoutes(app, resolvedServices);
  registerFeedbackRoutes(app, resolvedServices);
  registerVersionRoutes(app, resolvedServices);
  registerAdminRoutes(app, resolvedServices);

  return app;
}

export const app = createApp();
