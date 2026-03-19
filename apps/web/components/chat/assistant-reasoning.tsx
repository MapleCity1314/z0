"use client";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ThinkingVoid } from "@/components/chat/thinking-void";
import { CHAT_MESSAGE_FRAME_CLASS } from "@/components/chat/layout";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  extractReasoningText,
  getReasoningHeaderLabel,
  isReasoningStreaming,
  parseReasoningStages,
} from "@/lib/agent/chat/reasoning-stages";
import { cn } from "@/lib/utils";
import {
  getToolName,
  getToolTaskInfo,
  isSearchToolName,
} from "@/lib/agent/chat/message-part-rendering";
import type { UIMessage } from "ai";
import {
  BrainIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeIcon,
} from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";

type AssistantReasoningProps = {
  parts: UIMessage["parts"];
};

type SearchToolPart = {
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  errorText?: string;
};

function isSearchToolPart(part: unknown): part is SearchToolPart & { type: string } {
  if (!part || typeof part !== "object" || !("type" in part)) {
    return false;
  }

  const toolName = getToolName(part as any);
  return !!toolName && isSearchToolName(toolName);
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

type SearchStep = {
  key: string;
  label: string;
  description?: string;
  status: "complete" | "active" | "error";
  content: ReturnType<typeof renderSearchStepContent>;
};

function SearchReasoningStep({
  step,
  defaultOpen = false,
}: {
  step: SearchStep;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const label =
    step.status === "active" ? (
      <Shimmer as="span" duration={1.6}>
        {step.label}
      </Shimmer>
    ) : (
      step.label
    );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <ChainOfThoughtStep
        icon={GlobeIcon}
        label={
          <CollapsibleTrigger className="flex w-full items-center gap-2 text-left">
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <ChevronRightIcon
              className={cn(
                "size-4 shrink-0 text-zinc-400 transition-transform",
                isOpen && "rotate-90",
              )}
            />
          </CollapsibleTrigger>
        }
        description={step.description}
        status={step.status}
        className="text-muted-foreground"
      >
        <CollapsibleContent className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-1">
          {step.content ? (
            <div className="text-muted-foreground/80">{step.content}</div>
          ) : null}
        </CollapsibleContent>
      </ChainOfThoughtStep>
    </Collapsible>
  );
}

export function AssistantReasoning({
  parts,
}: AssistantReasoningProps) {
  const reasoningStreaming = isReasoningStreaming(parts);
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
  const activeSearchStep =
    [...searchSteps].reverse().find((step) => step.status === "active") ?? null;
  const completedSearchSteps = searchSteps.filter(
    (step) => step.key !== activeSearchStep?.key,
  );

  const completedStages = reasoningStreaming ? stages.slice(0, -1) : stages;
  const activeStage = reasoningStreaming ? (stages.at(-1) ?? null) : null;
  const headerLabel = getReasoningHeaderLabel(parts) || "Thinking";
  const [isOpen, setIsOpen] = useState(false);

  if (
    completedStages.length === 0 &&
    !activeStage &&
    completedSearchSteps.length === 0 &&
    !activeSearchStep
  ) {
    return null;
  }

  return (
    <Collapsible
      className={CHAT_MESSAGE_FRAME_CLASS}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left text-muted-foreground transition-colors hover:text-foreground",
          isOpen && "pb-2",
        )}
      >
        <span className="min-w-0 flex-1 overflow-visible">
          {reasoningStreaming ? (
            <ThinkingVoid label={headerLabel} className="min-w-0 overflow-visible" />
          ) : (
            <span className="block truncate py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              {headerLabel}
            </span>
          )}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-zinc-400 transition-transform",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2">
        {completedStages.length > 0 ||
        completedSearchSteps.length > 0 ||
        activeSearchStep ||
        activeStage ? (
          <ChainOfThought defaultOpen className="space-y-3">
            <ChainOfThoughtContent className="mt-0 space-y-3">
              {completedStages.map((stage, index) => (
                <ChainOfThoughtStep
                  key={`stage-${index}-${stage.title}`}
                  icon={BrainIcon}
                  label={stage.title}
                  status="complete"
                  className="text-muted-foreground"
                >
                  {stage.body ? (
                    <div className="text-muted-foreground/80 text-sm">
                      <Streamdown remarkRehypeOptions={{ allowDangerousHtml: false }}>
                        {stage.body}
                      </Streamdown>
                    </div>
                  ) : null}
                </ChainOfThoughtStep>
              ))}
              {completedSearchSteps.map((step) => (
                <SearchReasoningStep key={step.key} step={step} defaultOpen={false} />
              ))}
              {activeSearchStep ? (
                <SearchReasoningStep
                  key={activeSearchStep.key}
                  step={activeSearchStep}
                  defaultOpen={false}
                />
              ) : null}
              {activeStage ? (
                <ChainOfThoughtStep
                  icon={BrainIcon}
                  label={
                    <Shimmer as="span" duration={1.6}>
                      {activeStage.title}
                    </Shimmer>
                  }
                  status="active"
                  className="text-muted-foreground"
                >
                  {activeStage.body ? (
                    <div className="text-muted-foreground/80 text-sm">
                      <Streamdown remarkRehypeOptions={{ allowDangerousHtml: false }}>
                        {activeStage.body}
                      </Streamdown>
                    </div>
                  ) : null}
                </ChainOfThoughtStep>
              ) : null}
            </ChainOfThoughtContent>
          </ChainOfThought>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
