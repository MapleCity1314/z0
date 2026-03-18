import { headers } from "next/headers";
import { createInternalAuthHeaders } from "@z0/backend";

type ApiError = {
  code?: string;
  message: string;
  details?: Record<string, unknown>;
};

type ApiResponse<T> = {
  data?: T;
  error?: ApiError;
};

const fallbackMessageByStatus: Record<number, string> = {
  401: "Authentication required",
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

function getFallbackMessage(status: number) {
  if (status >= 500) {
    return "Something went wrong. Please try again later.";
  }

  return fallbackMessageByStatus[status] ?? `API request failed: ${status}`;
}

function normalizeApiErrorMessage(status: number, error?: ApiError) {
  if (status === 401 || status === 403 || status === 404) {
    return getFallbackMessage(status);
  }

  if (status >= 500) {
    return getFallbackMessage(status);
  }

  return error?.message?.trim() || getFallbackMessage(status);
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as ApiResponse<T>;
  }

  const text = await response.text();
  return {
    error: {
      message: text || `API request failed: ${response.status}`,
    },
  };
}

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

type ApiFetchOptions = {
  actor?: {
    userId: string;
    role?: string | null;
  };
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: ApiFetchOptions,
): Promise<T> {
  const internalHeaders = options?.actor
    ? createInternalAuthHeaders({
        actor: {
          userId: options.actor.userId,
          role: options.actor.role ?? "user",
        },
        purpose: "web-api",
      })
    : {};
  const cookie = options?.actor ? null : (await headers()).get("cookie");
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
      ...(cookie ? { cookie } : {}),
      ...internalHeaders,
    },
    cache: init?.cache ?? "no-store",
  });

  const payload = await parseApiResponse<T>(response);
  if (!response.ok || payload.error) {
    throw new ApiClientError({
      status: response.status,
      code: payload.error?.code,
      details: payload.error?.details,
      message: normalizeApiErrorMessage(response.status, payload.error),
    });
  }

  if (payload.data === undefined) {
    throw new ApiClientError({
      status: response.status,
      message: "API response missing data",
    });
  }

  return payload.data;
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

  return error instanceof Error && error.message ? error.message : fallback;
}
