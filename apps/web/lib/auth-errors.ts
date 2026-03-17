export function isUnauthenticatedMessage(message?: string | null) {
  if (!message) {
    return false;
  }

  const normalized = message.trim().toLowerCase();

  return (
    normalized === "unauthorized" ||
    normalized === "user not authenticated" ||
    normalized === "authentication required"
  );
}
