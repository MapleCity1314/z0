import type { UIMessage, UIMessagePart } from "ai";
import { getToolName, getToolTaskInfo } from "./message-part-rendering";

export type ReasoningStage = {
  title: string;
  body: string;
};

type ReasoningPartLike = UIMessagePart<any, any> & {
  type: "reasoning";
  text?: string;
  state?: string;
};

type ToolPartLike = UIMessagePart<any, any> & {
  type: string;
  toolName?: string;
  state?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
};

const SEARCH_TOOL_NAMES = new Set([
  "tavilySearch",
  "tavilyExtract",
  "tavilyCrawl",
  "tavilyMap",
]);

const STAGE_HEADING_PATTERN = /^##\s+(.+?)\s*$/gm;

function cleanBlock(text: string) {
  return text.trim();
}

export function extractReasoningText(parts: UIMessage["parts"]): string {
  return parts
    .filter(
      (part): part is ReasoningPartLike => part.type === "reasoning",
    )
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

export function isReasoningStreaming(parts: UIMessage["parts"]): boolean {
  return parts.some(
    (part): part is ReasoningPartLike =>
      part.type === "reasoning" && part.state === "streaming",
  );
}

export function parseReasoningStages(text: string): ReasoningStage[] {
  const input = text.trim();
  if (!input) {
    return [];
  }

  const matches = [...input.matchAll(STAGE_HEADING_PATTERN)];
  if (matches.length === 0) {
    return [
      {
        title: "Thinking",
        body: input,
      },
    ];
  }

  const stages: ReasoningStage[] = [];
  const firstHeadingIndex = matches[0]?.index ?? 0;
  const preface = cleanBlock(input.slice(0, firstHeadingIndex));

  if (preface) {
    stages.push({
      title: "Thinking",
      body: preface,
    });
  }

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const title = cleanBlock(match[1] ?? "");
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? input.length;
    const body = cleanBlock(input.slice(start, end));

    if (!title) {
      continue;
    }

    stages.push({ title, body });
  }

  return stages;
}

export function getCurrentReasoningStage(
  parts: UIMessage["parts"],
): ReasoningStage | null {
  const stages = parseReasoningStages(extractReasoningText(parts));
  return stages.at(-1) ?? null;
}

export function getReasoningHeaderLabel(
  parts: UIMessage["parts"],
): string | null {
  const currentStage = getCurrentReasoningStage(parts);
  if (currentStage?.title) {
    return currentStage.title;
  }

  const activeSearchTool = [...parts]
    .reverse()
    .find((part): part is ToolPartLike => {
      const toolName = getToolName(part);
      return (
        !!toolName &&
        SEARCH_TOOL_NAMES.has(toolName) &&
        ((part as ToolPartLike).state === "input-available" ||
          (part as ToolPartLike).state === "input-streaming")
      );
    });

  if (!activeSearchTool) {
    return null;
  }

  const toolName = getToolName(activeSearchTool);
  if (!toolName) {
    return null;
  }

  return getToolTaskInfo(
    toolName,
    activeSearchTool.input,
    activeSearchTool.output,
    true,
  ).title;
}
