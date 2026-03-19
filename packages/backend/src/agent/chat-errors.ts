import { buildZ0MaxErrorHint } from "./request";

export class AgentChatOrchestrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function mapAgentChatError(error: unknown, requestedModel?: string) {
  if (error instanceof AgentChatOrchestrationError) {
    return {
      status: error.status,
      body: {
        code: error.code,
        message: error.message,
      },
    };
  }

  let cause =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);

  if (
    requestedModel === "z0-max" &&
    (cause.toLowerCase().includes("not found") ||
      cause.toLowerCase().includes("service unavailable") ||
      cause.includes("503"))
  ) {
    cause = buildZ0MaxErrorHint(cause);
  }

  return {
    status: 500,
    body: {
      code: "bad_request:api",
      message: "Failed to process chat request",
      cause,
    },
  };
}
