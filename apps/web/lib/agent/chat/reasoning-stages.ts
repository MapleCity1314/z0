import type { UIMessage, UIMessagePart } from "ai";

export type ReasoningStage = {
  title: string;
  body: string;
};

const STAGE_HEADING_PATTERN = /^##\s+(.+?)\s*$/gm;

function cleanBlock(text: string) {
  return text.trim();
}

export function extractReasoningText(parts: UIMessage["parts"]): string {
  return parts
    .filter(
      (
        part,
      ): part is UIMessagePart<any, any> & { type: "reasoning"; text?: string } =>
        part.type === "reasoning",
    )
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
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
