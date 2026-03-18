import { z } from "zod";

export const toolBridgeErrorCodeSchema = z.enum([
  "bad_request:tool_bridge",
  "forbidden:tool_bridge",
  "not_found:tool_bridge",
  "failed:tool_bridge",
  "invalid_response:tool_bridge",
]);

export type ToolBridgeErrorCode = z.infer<typeof toolBridgeErrorCodeSchema>;

export const toolBridgeRequestPayloadSchema = z.object({
  chatId: z.string().min(1).optional(),
  projectId: z.string().nullable().optional(),
  webSearchEnabled: z.boolean(),
  toolCallId: z.string().optional(),
  input: z.unknown(),
  context: z
    .object({
      messages: z.unknown().optional(),
    })
    .partial()
    .optional(),
});

export type ToolBridgeRequestPayload = z.infer<
  typeof toolBridgeRequestPayloadSchema
>;

export const toolBridgeSuccessResponseSchema = z.object({
  data: z.unknown(),
}).refine((value) => Object.prototype.hasOwnProperty.call(value, "data"));

export type ToolBridgeSuccessResponse = z.infer<
  typeof toolBridgeSuccessResponseSchema
>;

export const toolBridgeErrorResponseSchema = z.object({
  error: z.object({
    code: toolBridgeErrorCodeSchema,
    message: z.string(),
    status: z.number().int().min(400).max(599),
    retryable: z.boolean().optional(),
    toolName: z.string().min(1).optional(),
  }),
}).refine((value) => Object.prototype.hasOwnProperty.call(value, "error"));

export type ToolBridgeErrorResponse = z.infer<
  typeof toolBridgeErrorResponseSchema
>;

function inferToolBridgeErrorCode(status: number): ToolBridgeErrorCode {
  switch (status) {
    case 400:
      return "bad_request:tool_bridge";
    case 403:
      return "forbidden:tool_bridge";
    case 404:
      return "not_found:tool_bridge";
    default:
      return "failed:tool_bridge";
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

export function parseToolBridgeRequestBody(
  body: unknown,
): ToolBridgeRequestPayload {
  const input = (body ?? {}) as {
    chatId?: string;
    projectId?: string | null;
    webSearchEnabled?: boolean;
    toolCallId?: string;
    input?: unknown;
    context?: { messages?: unknown };
  };

  return toolBridgeRequestPayloadSchema.parse({
    chatId: input.chatId,
    projectId: input.projectId ?? null,
    webSearchEnabled: input.webSearchEnabled ?? false,
    toolCallId: input.toolCallId,
    input: input.input ?? {},
    context: input.context,
  });
}

export function createToolBridgeSuccessResponse(
  data: unknown,
): ToolBridgeSuccessResponse {
  return {
    data,
  };
}

export function createToolBridgeErrorResponse(params: {
  code: ToolBridgeErrorCode;
  message: string;
  status: number;
  retryable?: boolean;
  toolName?: string;
}): ToolBridgeErrorResponse {
  return {
    error: {
      code: params.code,
      message: params.message,
      status: params.status,
      retryable: params.retryable,
      toolName: params.toolName,
    },
  };
}

export function normalizeToolBridgeExecutionError(params: {
  error: unknown;
  toolName: string;
  fallbackMessage?: string;
}): ToolBridgeErrorResponse {
  if (params.error instanceof z.ZodError) {
    return createToolBridgeErrorResponse({
      code: "bad_request:tool_bridge",
      message: "Invalid tool input",
      status: 400,
      retryable: false,
      toolName: params.toolName,
    });
  }

  const candidate = params.error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
    retryable?: unknown;
  } | null;
  const parsedStatus =
    typeof candidate?.status === "number" &&
    Number.isInteger(candidate.status) &&
    candidate.status >= 400 &&
    candidate.status <= 599
      ? candidate.status
      : 500;
  const parsedCode = toolBridgeErrorCodeSchema.safeParse(candidate?.code);
  const retryable =
    typeof candidate?.retryable === "boolean"
      ? candidate.retryable
      : parsedStatus >= 500;

  return createToolBridgeErrorResponse({
    code: parsedCode.success
      ? parsedCode.data
      : inferToolBridgeErrorCode(parsedStatus),
    message:
      parsedStatus >= 500
        ? params.fallbackMessage ?? "Tool execution failed"
        : getErrorMessage(
            params.error,
            params.fallbackMessage ?? "Tool execution failed",
          ),
    status: parsedStatus,
    retryable,
    toolName: params.toolName,
  });
}

export function getToolBridgeErrorStatus(error: unknown) {
  if (error instanceof z.ZodError) {
    return 400;
  }

  const candidate = error as { status?: unknown } | null;
  if (
    typeof candidate?.status === "number" &&
    Number.isInteger(candidate.status) &&
    candidate.status >= 400 &&
    candidate.status <= 599
  ) {
    return candidate.status;
  }

  return 500;
}

export function parseToolBridgeResponse(
  payload: unknown,
): ToolBridgeSuccessResponse | ToolBridgeErrorResponse {
  const successResult = toolBridgeSuccessResponseSchema.safeParse(payload);
  if (successResult.success) {
    return successResult.data;
  }

  const structuredErrorResult = toolBridgeErrorResponseSchema.safeParse(payload);
  if (structuredErrorResult.success) {
    return structuredErrorResult.data;
  }

  const legacyErrorResult = z
    .object({
      error: z.object({
        message: z.string(),
      }),
    })
    .safeParse(payload);

  if (legacyErrorResult.success) {
    return createToolBridgeErrorResponse({
      code: "failed:tool_bridge",
      message: legacyErrorResult.data.error.message,
      status: 500,
    });
  }

  return toolBridgeErrorResponseSchema.parse(payload);
}
