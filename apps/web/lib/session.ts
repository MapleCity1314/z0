import { headers } from "next/headers";
import { resolveSessionActor, verifyInternalAuthHeaders } from "@z0/backend/auth";
import { auth } from "./auth";

function getInternalActorFromHeaders(requestHeaders: Headers) {
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
  const requestHeaders = await headers();

  return auth.api.getSession({
    headers: requestHeaders,
  });
}

export async function getCurrentUser() {
  const requestHeaders = await headers();
  const internalActor = getInternalActorFromHeaders(requestHeaders);
  if (internalActor) {
    return internalActor;
  }

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  if (session) {
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      avatar: session.user.image ?? null,
      role: (session.user as { role?: string }).role ?? "user",
    };
  }

  const sessionActor = await resolveSessionActor(requestHeaders);
  if (!sessionActor) {
    return null;
  }

  return {
    id: sessionActor.userId,
    name: "",
    email: "",
    avatar: null,
    role: sessionActor.role ?? "user",
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
