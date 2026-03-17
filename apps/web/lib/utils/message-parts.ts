type JsonRecord = Record<string, unknown>;
type StoredMessagePartEnvelope = {
  kind: string;
  version: 1;
  payload: JsonRecord;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function isStoredEnvelope(value: unknown): value is StoredMessagePartEnvelope {
  return (
    isRecord(value) &&
    typeof value.kind === "string" &&
    value.version === 1 &&
    isRecord(value.payload)
  );
}

function isLegacyToolCallPart(part: JsonRecord): boolean {
  return part.type === "tool-call" && typeof part.toolCallId === "string";
}

function isLegacyToolResultPart(part: JsonRecord): boolean {
  return part.type === "tool-result" && typeof part.toolCallId === "string";
}

function toToolPartType(toolName: unknown): string {
  const safeToolName =
    typeof toolName === "string" && toolName.length > 0 ? toolName : "unknown";
  return `tool-${safeToolName}`;
}

function getPartKind(part: JsonRecord): string {
  if (typeof part.type !== "string") {
    return "unknown";
  }

  if (part.type.startsWith("tool-")) {
    return "tool";
  }

  if (part.type.startsWith("data-")) {
    return "data";
  }

  return part.type;
}

function getToolInput(callPart: JsonRecord): unknown {
  if ("args" in callPart) return callPart.args;
  if ("input" in callPart) return callPart.input;
  return {};
}

function getToolOutput(resultPart: JsonRecord): unknown {
  if ("result" in resultPart) return resultPart.result;
  if ("output" in resultPart) return resultPart.output;
  return null;
}

function toLegacyMergedToolPart(
  callPart: JsonRecord | undefined,
  resultPart: JsonRecord | undefined,
): JsonRecord {
  const toolName = callPart?.toolName ?? resultPart?.toolName;
  const toolCallId =
    (callPart?.toolCallId as string | undefined) ??
    (resultPart?.toolCallId as string | undefined) ??
    crypto.randomUUID();

  const base: JsonRecord = {
    type: toToolPartType(toolName),
    toolCallId,
  };

  if (typeof toolName === "string" && toolName.length > 0) {
    base.toolName = toolName;
  }

  if (resultPart) {
    return {
      ...base,
      state: "output-available",
      input: callPart ? getToolInput(callPart) : {},
      output: getToolOutput(resultPart),
    };
  }

  return {
    ...base,
    state: "input-available",
    input: callPart ? getToolInput(callPart) : {},
  };
}

function toStoredEnvelope(part: JsonRecord): StoredMessagePartEnvelope {
  return {
    kind: getPartKind(part),
    version: 1,
    payload: part,
  };
}

function unwrapStoredEnvelope(part: unknown): JsonRecord | null {
  if (!isStoredEnvelope(part)) {
    return null;
  }

  return part.payload;
}

/**
 * Normalize stored parts so both new-format and legacy tool parts can be rendered.
 */
export function normalizeStoredMessageParts(parts: unknown): JsonRecord[] {
  if (!Array.isArray(parts)) {
    return [];
  }

  const resultById = new Map<string, JsonRecord>();
  const rawParts = parts
    .map((rawPart) => unwrapStoredEnvelope(rawPart) ?? rawPart)
    .filter(isRecord);

  for (const rawPart of rawParts) {
    if (!isLegacyToolResultPart(rawPart)) continue;
    resultById.set(rawPart.toolCallId as string, rawPart);
  }

  const handledToolCallIds = new Set<string>();
  const normalized: JsonRecord[] = [];

  for (const rawPart of rawParts) {
    if (isLegacyToolCallPart(rawPart)) {
      const toolCallId = rawPart.toolCallId as string;
      if (handledToolCallIds.has(toolCallId)) continue;

      normalized.push(
        toLegacyMergedToolPart(rawPart, resultById.get(toolCallId)),
      );
      handledToolCallIds.add(toolCallId);
      continue;
    }

    if (isLegacyToolResultPart(rawPart)) {
      const toolCallId = rawPart.toolCallId as string;
      if (handledToolCallIds.has(toolCallId)) continue;

      normalized.push(toLegacyMergedToolPart(undefined, rawPart));
      handledToolCallIds.add(toolCallId);
      continue;
    }

    normalized.push(rawPart);
  }

  return normalized;
}

/**
 * Normalize incoming UI parts into a versioned storage envelope.
 */
export function normalizeMessagePartsForStorage(
  parts: unknown,
): StoredMessagePartEnvelope[] {
  return normalizeStoredMessageParts(parts).map(toStoredEnvelope);
}

/**
 * Extract file attachments from UI message parts for DB storage.
 */
export function extractFileAttachmentsFromParts(parts: unknown): Array<{
  url: string;
  mediaType: string;
  filename?: string;
}> {
  if (!Array.isArray(parts)) {
    return [];
  }

  const attachments: Array<{
    url: string;
    mediaType: string;
    filename?: string;
  }> = [];

  for (const rawPart of normalizeStoredMessageParts(parts)) {
    if (rawPart.type !== "file") continue;
    if (
      typeof rawPart.url !== "string" ||
      typeof rawPart.mediaType !== "string"
    )
      continue;

    attachments.push({
      url: rawPart.url,
      mediaType: rawPart.mediaType,
      filename:
        typeof rawPart.filename === "string" ? rawPart.filename : undefined,
    });
  }

  return attachments;
}
