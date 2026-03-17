import type { Hono } from "hono";
import type { HealthcheckPayload } from "@z0/shared-types";
import { getEnv } from "../env";

export function registerHealthRoutes(app: Hono) {
  const renderHealth = () => ({
    ok: true as const,
    service: getEnv().API_NAME,
    timestamp: new Date().toISOString(),
    version: getEnv().API_VERSION,
  });

  app.get("/", (c) => c.json(renderHealth() satisfies HealthcheckPayload));
  app.get("/health", (c) =>
    c.json(renderHealth() satisfies HealthcheckPayload),
  );
}
