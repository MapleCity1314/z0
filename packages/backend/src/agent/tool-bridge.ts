import { z } from "zod";

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
    message: z.string(),
  }),
}).refine((value) => Object.prototype.hasOwnProperty.call(value, "error"));

export type ToolBridgeErrorResponse = z.infer<
  typeof toolBridgeErrorResponseSchema
>;

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

export function createToolBridgeErrorResponse(
  message: string,
): ToolBridgeErrorResponse {
  return {
    error: {
      message,
    },
  };
}

export function parseToolBridgeResponse(
  payload: unknown,
): ToolBridgeSuccessResponse | ToolBridgeErrorResponse {
  const successResult = toolBridgeSuccessResponseSchema.safeParse(payload);
  if (successResult.success) {
    return successResult.data;
  }

  return toolBridgeErrorResponseSchema.parse(payload);
}
