import type { FileUIPart, UIMessage } from "ai";
import { generateUUID } from "@/lib/utils";

const FILE_OPERATION_TOOLS = new Set([
  "createProjectFile",
  "updateProjectFile",
  "patchProjectFile",
  "deleteProjectFile",
]);

const PROJECT_CODE_TOOLS = new Set([
  "createProjectFile",
  "updateProjectFile",
  "patchProjectFile",
  "deleteProjectFile",
  "createProject",
  "addDependency",
  "removeDependency",
  "installDependencies",
  "runBuild",
  "runLint",
  "runFormat",
  "runScript",
]);

type ToolLikePart = {
  type?: string;
  toolName?: string;
  toolCallId?: string;
  state?: string;
  output?: { success?: boolean; projectId?: string };
};

export type AgentErrorPart = {
  type: "data-error";
  data: {
    title: string;
    message: string;
    cause?: string;
    timestamp: string;
  };
};

function getToolName(part: ToolLikePart) {
  return part.toolName || part.type?.replace("tool-", "") || "";
}

function isToolLikePart(part: unknown): part is ToolLikePart {
  return !!part && typeof part === "object" && "type" in part;
}

export function buildOutgoingUserMessage(message: {
  text: string;
  files: FileUIPart[];
}): UIMessage {
  const parts: UIMessage["parts"] = [];

  if (message.text.trim()) {
    parts.push({ type: "text", text: message.text });
  }

  if (message.files.length > 0) {
    parts.push(...message.files);
  }

  return {
    id: generateUUID(),
    role: "user",
    parts,
  };
}

export function buildAssistantErrorPart(params: {
  message: string;
  cause?: string;
  timestamp?: string;
}): AgentErrorPart {
  return {
    type: "data-error",
    data: {
      title: "Error",
      message: params.message,
      cause: params.cause,
      timestamp: params.timestamp ?? new Date().toISOString(),
    },
  };
}

export function upsertAssistantErrorMessage(params: {
  messages: UIMessage[];
  errorPart: AgentErrorPart;
}): { messages: UIMessage[]; errorMessage: UIMessage } {
  const { messages, errorPart } = params;
  const lastMessage = messages[messages.length - 1];

  if (lastMessage?.role === "assistant") {
    const updatedMessage: UIMessage = {
      ...lastMessage,
      parts: [...lastMessage.parts, errorPart],
    };

    return {
      messages: [...messages.slice(0, -1), updatedMessage],
      errorMessage: updatedMessage,
    };
  }

  const errorMessage: UIMessage = {
    id: generateUUID(),
    role: "assistant",
    parts: [errorPart],
  };

  return {
    messages: [...messages, errorMessage],
    errorMessage,
  };
}

export function getChatToolEffects(
  messages: UIMessage[],
  handledToolCallIds: Set<string>,
) {
  const nextHandledToolCallIds = new Set(handledToolCallIds);
  let projectIdToOpen: string | null = null;
  let shouldTriggerFileUpdate = false;

  for (const message of messages) {
    if (message.role !== "assistant") continue;

    for (const rawPart of message.parts as unknown[]) {
      if (!isToolLikePart(rawPart) || !rawPart.type?.startsWith("tool-")) {
        continue;
      }

      const part = rawPart;
      const toolCallId = part.toolCallId;
      if (!toolCallId) continue;

      if (part.state !== "output-available" || !part.output?.success) {
        continue;
      }

      if (nextHandledToolCallIds.has(toolCallId)) {
        continue;
      }

      const toolName = getToolName(part);
      nextHandledToolCallIds.add(toolCallId);

      if (toolName === "createProject" && part.output.projectId) {
        projectIdToOpen = part.output.projectId;
      }

      if (FILE_OPERATION_TOOLS.has(toolName)) {
        shouldTriggerFileUpdate = true;
      }
    }
  }

  return {
    nextHandledToolCallIds,
    projectIdToOpen,
    shouldTriggerFileUpdate,
  };
}

export function isProjectGenerationActive(
  messages: UIMessage[],
  selectedProjectId: string | null,
) {
  if (!selectedProjectId) {
    return false;
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role !== "assistant") {
    return false;
  }

  return lastMessage.parts.some((part) => {
    if (!isToolLikePart(part) || !part.type?.startsWith("tool-")) {
      return false;
    }

    const toolName = getToolName(part);
    if (!PROJECT_CODE_TOOLS.has(toolName)) {
      return false;
    }

    return part.state === "input-available" || part.state === "input-streaming";
  });
}
