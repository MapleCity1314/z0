"use client";

import { createAuthClient } from "better-auth/react";

export function getAuthClientBaseURL(
  appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  runtimeOrigin = typeof window !== "undefined"
    ? window.location.origin
    : undefined,
) {
  return new URL("/api/auth", runtimeOrigin ?? appUrl).toString();
}

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseURL(),
});
