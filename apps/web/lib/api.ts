import {
  ApiClientError,
  normalizeApiErrorMessage,
} from "@/lib/api-errors";

type ApiError = {
  code?: string;
  message: string;
  details?: Record<string, unknown>;
};

type ApiResponse<T> = {
  data?: T;
  error?: ApiError;
};

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

async function getForwardedCookie(options?: ApiFetchOptions) {
  if (options?.actor || typeof window !== "undefined") {
    return null;
  }

  const { headers } = await import("next/headers");
  return (await headers()).get("cookie");
}

type ApiFetchOptions = {
  actor?: {
    userId: string;
    role?: string | null;
  };
};

async function getInternalHeaders(options?: ApiFetchOptions) {
  if (!options?.actor) {
    return {};
  }

  const { createInternalAuthHeaders } = await import("@z0/backend");
  return createInternalAuthHeaders({
    actor: {
      userId: options.actor.userId,
      role: options.actor.role ?? "user",
    },
    purpose: "web-api",
  });
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: ApiFetchOptions,
): Promise<T> {
  const internalHeaders = await getInternalHeaders(options);
  const cookie = await getForwardedCookie(options);
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
