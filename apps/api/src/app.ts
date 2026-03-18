import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { registerAgentRoutes } from "./routes/agent";
import { registerAdminRoutes } from "./routes/admin";
import { registerFeedbackRoutes } from "./routes/feedback";
import { registerHealthRoutes } from "./routes/health";
import { registerProjectRoutes } from "./routes/projects";
import { registerUserRoutes } from "./routes/users";
import { registerVersionRoutes } from "./routes/versions";
import { loadApiEnv } from "./env";
import { createServices, type AppServices } from "./services";

loadApiEnv();

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
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.API_BASE_URL,
  ].filter((value): value is string => Boolean(value));

  app.use(
    "/*",
    cors({
      origin: (origin) => {
        if (!origin) {
          return "";
        }

        return allowedOrigins.includes(origin) ? origin : "";
      },
      allowHeaders: ["content-type"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  );

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      const message =
        error.message.trim().length > 0
          ? error.message
          : error.status === 401
            ? "Unauthorized"
            : error.status === 403
              ? "Forbidden"
              : "Request failed";
      const code =
        error.status === 401
          ? "unauthorized"
          : error.status === 403
            ? "forbidden"
            : "request_failed";

      return c.json(
        {
          error: {
            code,
            message,
          },
        },
        error.status,
      );
    }

    console.error("[api] unhandled error", error);

    return c.json(
      {
        error: {
          code: "internal_error",
          message: "Internal server error",
        },
      },
      500,
    );
  });

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
