import { createHmac, timingSafeEqual } from "node:crypto";

export type InternalActor = {
  userId: string;
  role?: string | null;
};

export type InternalAuthPurpose = "web-api" | "agent-bridge";

const INTERNAL_AUTH_MAX_AGE_MS = 60_000;

function getInternalAuthSecret() {
  if (process.env.AGENT_BRIDGE_TOKEN) {
    return process.env.AGENT_BRIDGE_TOKEN;
  }

  if (process.env.NODE_ENV !== "production") {
    return "local-dev-agent-bridge-token";
  }

  throw new Error("AGENT_BRIDGE_TOKEN environment variable is not set");
}

function signInternalAuthPayload(payload: string) {
  return createHmac("sha256", getInternalAuthSecret())
    .update(payload)
    .digest("hex");
}

function buildPayload(params: {
  actor: InternalActor;
  purpose: InternalAuthPurpose;
  timestamp: string;
}) {
  return [
    params.purpose,
    params.actor.userId,
    params.actor.role ?? "",
    params.timestamp,
  ].join(":");
}

export function createInternalAuthHeaders(params: {
  actor: InternalActor;
  purpose: InternalAuthPurpose;
  now?: number;
}) {
  const timestamp = String(params.now ?? Date.now());
  const payload = buildPayload({
    actor: params.actor,
    purpose: params.purpose,
    timestamp,
  });

  return {
    "x-internal-actor-id": params.actor.userId,
    ...(params.actor.role
      ? { "x-internal-actor-role": params.actor.role }
      : {}),
    "x-internal-auth-purpose": params.purpose,
    "x-internal-auth-ts": timestamp,
    "x-internal-auth-sig": signInternalAuthPayload(payload),
  };
}

export function verifyInternalAuthHeaders(
  headers: Headers,
  purpose: InternalAuthPurpose,
) {
  const userId = headers.get("x-internal-actor-id");
  const role = headers.get("x-internal-actor-role");
  const headerPurpose = headers.get("x-internal-auth-purpose");
  const timestamp = headers.get("x-internal-auth-ts");
  const signature = headers.get("x-internal-auth-sig");

  if (
    !userId ||
    !timestamp ||
    !signature ||
    !headerPurpose ||
    headerPurpose !== purpose
  ) {
    return null;
  }

  const age = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(age) || age > INTERNAL_AUTH_MAX_AGE_MS) {
    return null;
  }

  const expected = signInternalAuthPayload(
    buildPayload({
      actor: { userId, role },
      purpose,
      timestamp,
    }),
  );

  const received = Buffer.from(signature, "utf8");
  const computed = Buffer.from(expected, "utf8");

  if (
    received.length !== computed.length ||
    !timingSafeEqual(received, computed)
  ) {
    return null;
  }

  return {
    userId,
    role: role ?? "user",
  };
}
