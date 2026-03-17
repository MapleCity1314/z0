"use client";

import { createAuthClient } from "better-auth/react";

export function getAuthClientBaseURL(
  appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
) {
  return new URL("/api/auth", appUrl).toString();
}

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseURL(),
});
