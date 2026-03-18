import {
  AUTHENTICATION_REQUIRED_MESSAGE,
  getApiErrorMessage,
  isApiErrorStatus,
  normalizeAuthErrorMessage,
} from "@/lib/api-errors";

export { AUTHENTICATION_REQUIRED_MESSAGE } from "@/lib/api-errors";

export function isUnauthenticatedMessage(errorOrMessage?: unknown) {
  if (isApiErrorStatus(errorOrMessage, 401)) {
    return true;
  }

  const message =
    typeof errorOrMessage === "string"
      ? errorOrMessage
      : errorOrMessage instanceof Error
        ? errorOrMessage.message
        : null;

  if (!message) {
    return false;
  }

  return normalizeAuthErrorMessage(message) === AUTHENTICATION_REQUIRED_MESSAGE;
}

export function shouldShowErrorToast(errorOrMessage?: unknown) {
  return !isUnauthenticatedMessage(errorOrMessage);
}

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (isUnauthenticatedMessage(error)) {
    return AUTHENTICATION_REQUIRED_MESSAGE;
  }

  if (typeof error === "string") {
    const message = normalizeAuthErrorMessage(error);
    return message.trim() || fallback;
  }

  return getApiErrorMessage(error, fallback);
}
