import { isApiErrorStatus } from "@/lib/api";

export function isUnauthenticatedMessage(errorOrMessage?: unknown) {
  if (isApiErrorStatus(errorOrMessage, 401)) {
    return true;
  }

  if (typeof errorOrMessage !== "string") {
    return false;
  }

  const normalized = errorOrMessage.trim().toLowerCase();

  return (
    normalized === "unauthorized" ||
    normalized === "user not authenticated" ||
    normalized === "authentication required"
  );
}
