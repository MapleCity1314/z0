type ApiError = {
  code?: string;
  message: string;
  details?: Record<string, unknown>;
};

export const AUTHENTICATION_REQUIRED_MESSAGE = "Authentication required";

const unauthenticatedMessages = new Set([
  "unauthorized",
  "user not authenticated",
  "not authenticated",
  AUTHENTICATION_REQUIRED_MESSAGE.toLowerCase(),
]);

const fallbackMessageByStatus: Record<number, string> = {
  401: AUTHENTICATION_REQUIRED_MESSAGE,
  403: "You do not have access to this resource.",
  404: "The requested resource was not found.",
  422: "The request could not be processed. Please check your input.",
};

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor({
    status,
    message,
    code,
    details,
  }: {
    status: number;
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  }) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getFallbackMessage(status: number) {
  if (status >= 500) {
    return "Something went wrong. Please try again later.";
  }

  return fallbackMessageByStatus[status] ?? `API request failed: ${status}`;
}

export function normalizeAuthErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  if (unauthenticatedMessages.has(normalized)) {
    return AUTHENTICATION_REQUIRED_MESSAGE;
  }

  return message;
}

export function normalizeApiErrorMessage(status: number, error?: ApiError) {
  if (status === 401 || status === 403 || status === 404) {
    return getFallbackMessage(status);
  }

  if (status >= 500) {
    return getFallbackMessage(status);
  }

  return error?.message?.trim() || getFallbackMessage(status);
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function isApiErrorStatus(error: unknown, ...statuses: number[]) {
  return isApiClientError(error) && statuses.includes(error.status);
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (isApiClientError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return normalizeAuthErrorMessage(error.message);
  }

  return fallback;
}
