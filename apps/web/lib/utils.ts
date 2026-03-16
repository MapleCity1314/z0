import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { nanoid } from "nanoid";
import { ChatSDKError, ErrorCode } from "./error";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUUID() {
  return nanoid();
}

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const responseClone = response.clone();
      // Try to parse JSON error response
      try {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const payload = (await response.json()) as {
            code?: unknown;
            cause?: unknown;
            message?: unknown;
          };

          const cause =
            typeof payload.cause === "string"
              ? payload.cause
              : typeof payload.message === "string"
                ? payload.message
                : undefined;

          if (typeof payload.code === "string" && payload.code.includes(":")) {
            throw new ChatSDKError(payload.code as ErrorCode, cause);
          }

          const errorType = getErrorTypeFromStatus(response.status);
          throw new ChatSDKError(`${errorType}:api` as ErrorCode, cause);
        }
      } catch (parseError) {
        if (parseError instanceof ChatSDKError) {
          throw parseError;
        }
        // If JSON parsing fails, create error based on status code
        console.error("Failed to parse error response:", parseError);
      }

      // Fallback: create error based on HTTP status code
      const errorType = getErrorTypeFromStatus(response.status);
      const rawBody = (await responseClone.text().catch(() => "")).trim();
      const cause =
        rawBody.length > 0 ? rawBody.slice(0, 500) : response.statusText;
      throw new ChatSDKError(`${errorType}:api` as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ChatSDKError("offline:chat");
    }

    throw error;
  }
}

function getErrorTypeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 429:
      return "rate_limit";
    default:
      return "bad_request";
  }
}
