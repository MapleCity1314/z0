import { headers } from "next/headers";
import { verifyInternalAuthHeaders } from "@z0/backend/auth";
import { auth } from "./auth";

async function getInternalActorFromHeaders() {
  const requestHeaders = await headers();
  const actor =
    verifyInternalAuthHeaders(requestHeaders, "agent-bridge") ??
    verifyInternalAuthHeaders(requestHeaders, "web-api");

  if (!actor) {
    return null;
  }

  return {
    id: actor.userId,
    name: "",
    email: "",
    avatar: null,
    role: actor.role ?? "user",
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
