import { headers } from "next/headers";
import { auth } from "./auth";

function getAgentBridgeToken() {
  if (process.env.AGENT_BRIDGE_TOKEN) {
    return process.env.AGENT_BRIDGE_TOKEN;
  }

  if (process.env.NODE_ENV !== "production") {
    return "local-dev-agent-bridge-token";
  }

  return null;
}

async function getInternalActorFromHeaders() {
  const requestHeaders = await headers();
  const token = getAgentBridgeToken();
  const providedToken = requestHeaders.get("x-agent-bridge-token");
  const userId = requestHeaders.get("x-user-id");

  if (!token || providedToken !== token || !userId) {
    return null;
  }

  return {
    id: userId,
    name: requestHeaders.get("x-user-name") ?? "",
    email: requestHeaders.get("x-user-email") ?? "",
    avatar: null,
    role: requestHeaders.get("x-user-role") ?? "user",
  };
}

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function getCurrentUser() {
  const internalActor = await getInternalActorFromHeaders();
  if (internalActor) {
    return internalActor;
  }

  const session = await getSession();
  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    avatar: session.user.image ?? null,
    role: (session.user as { role?: string }).role ?? "user",
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
