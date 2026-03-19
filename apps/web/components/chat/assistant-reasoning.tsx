"use client";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  extractReasoningText,
  parseReasoningStages,
} from "@/lib/agent/chat/reasoning-stages";
import {
  getToolName,
  getToolTaskInfo,
} from "@/lib/agent/chat/message-part-rendering";
import type { UIMessage } from "ai";
import { BrainIcon, GlobeIcon } from "lucide-react";
import { Streamdown } from "streamdown";

type AssistantReasoningProps = {
  parts: UIMessage["parts"];
  isStreaming: boolean;
};

type SearchToolPart = {
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  errorText?: string;
};

const SEARCH_TOOL_NAMES = new Set([
  "tavilySearch",
  "tavilyExtract",
  "tavilyCrawl",
  "tavilyMap",
]);

function isSearchToolPart(part: unknown): part is SearchToolPart & { type: string } {
  if (!part || typeof part !== "object" || !("type" in part)) {
    return false;
  }

  const toolName = getToolName(part as any);
  return !!toolName && SEARCH_TOOL_NAMES.has(toolName);
}

function getSearchStepStatus(state?: string) {
  if (state === "output-error") {
    return "error" as const;
  }

  if (state === "input-available" || state === "input-streaming") {
    return "active" as const;
  }

  return "complete" as const;
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function renderSearchStepContent(toolPart: SearchToolPart, toolName: string) {
  if (toolName === "tavilySearch" && Array.isArray(toolPart.output?.results)) {
    const results = toolPart.output.results.slice(0, 4) as Array<{
      url?: string;
      title?: string;
    }>;

    if (results.length > 0) {
      return (
        <ChainOfThoughtSearchResults>
          {results.map((result, index) => (
            <ChainOfThoughtSearchResult key={`${result.url ?? "result"}-${index}`}>
              {result.url ? getHostname(result.url) : result.title || "result"}
            </ChainOfThoughtSearchResult>
          ))}
        </ChainOfThoughtSearchResults>
      );
    }
  }

  if (toolName === "tavilyExtract" && Array.isArray(toolPart.input?.urls)) {
    return (
      <ChainOfThoughtSearchResults>
        {toolPart.input.urls.slice(0, 4).map((url: string) => (
          <ChainOfThoughtSearchResult key={url}>
            {getHostname(url)}
          </ChainOfThoughtSearchResult>
        ))}
      </ChainOfThoughtSearchResults>
    );
  }

  if (
    (toolName === "tavilyCrawl" || toolName === "tavilyMap") &&
    toolPart.input?.url
  ) {
    return (
      <ChainOfThoughtSearchResults>
        <ChainOfThoughtSearchResult>
          {getHostname(toolPart.input.url)}
        </ChainOfThoughtSearchResult>
      </ChainOfThoughtSearchResults>
    );
  }

  if (toolPart.errorText) {
    return <div className="text-xs text-red-500">{toolPart.errorText}</div>;
  }

  return null;
}

export function AssistantReasoning({
  parts,
  isStreaming,
}: AssistantReasoningProps) {
  const reasoningText = extractReasoningText(parts);
  const stages = parseReasoningStages(reasoningText);
  const searchSteps = parts.filter(isSearchToolPart).map((part) => {
    const toolName = getToolName(part as any) ?? "search";
    const toolPart = part as SearchToolPart;
    const isRunning =
      toolPart.state === "input-available" || toolPart.state === "input-streaming";
    const taskInfo = getToolTaskInfo(
      toolName,
      toolPart.input,
      toolPart.output,
      isRunning,
    );

    return {
      key: `${toolName}-${toolPart.toolCallId ?? taskInfo.title}`,
      label: taskInfo.title,
      description: taskInfo.subtitle,
      status: getSearchStepStatus(toolPart.state),
      content: renderSearchStepContent(toolPart, toolName),
    };
  });

  const completedStages = isStreaming ? stages.slice(0, -1) : stages;
  const activeStage = isStreaming ? (stages.at(-1) ?? null) : null;

  if (completedStages.length === 0 && !activeStage && searchSteps.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <ChainOfThought defaultOpen={isStreaming}>
        <ChainOfThoughtHeader>
          {activeStage?.title || "Thought Process"}
        </ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          {completedStages.map((stage, index) => (
            <ChainOfThoughtStep
              key={`stage-${index}-${stage.title}`}
              icon={BrainIcon}
              label={stage.title}
              status="complete"
            >
              {stage.body ? (
                <div className="text-muted-foreground text-sm">
                  <Streamdown remarkRehypeOptions={{ allowDangerousHtml: false }}>
                    {stage.body}
                  </Streamdown>
                </div>
              ) : null}
            </ChainOfThoughtStep>
          ))}
          {searchSteps.map((step) => (
            <ChainOfThoughtStep
              key={step.key}
              icon={GlobeIcon}
              label={step.label}
              description={step.description}
              status={step.status}
            >
              {step.content}
            </ChainOfThoughtStep>
          ))}
        </ChainOfThoughtContent>
      </ChainOfThought>

      {activeStage?.body ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <MessageResponse>{activeStage.body}</MessageResponse>
        </div>
      ) : null}
    </div>
  );
}
