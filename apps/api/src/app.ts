import { Hono } from "hono";
import { cors } from "hono/cors";

import type { HealthcheckPayload } from "@z0/shared-types";

import { getEnv } from "./env";

export const app = new Hono();

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
