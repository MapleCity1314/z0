import { getCurrentUser } from "./session";

type ApiError = {
  code?: string;
  message: string;
  details?: Record<string, unknown>;
};

type ApiResponse<T> = {
  data?: T;
  error?: ApiError;
};

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
  const currentUser = options?.actor ? null : await getCurrentUser();
  const actor = options?.actor
    ? { id: options.actor.userId, role: options.actor.role ?? null }
    : currentUser;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
      ...(actor?.id ? { "x-user-id": actor.id } : {}),
      ...(actor?.role ? { "x-user-role": actor.role } : {}),
    },
    cache: init?.cache ?? "no-store",
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? `API request failed: ${response.status}`);
  }

  if (payload.data === undefined) {
    throw new Error("API response missing data");
  }

  return payload.data;
}
