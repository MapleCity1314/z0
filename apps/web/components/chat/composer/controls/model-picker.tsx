"use client";

import { ChevronDown } from "lucide-react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { selectableModels, type SelectableModelName } from "@/lib/agent/model";
import { cn } from "@/lib/utils";

type ModelPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel: SelectableModelName;
  thinkingEnabled: boolean;
  onModelChange: (model: SelectableModelName) => void;
};

export function ModelPicker({
  open,
  onOpenChange,
  selectedModel,
  thinkingEnabled,
  onModelChange,
}: ModelPickerProps) {
  const currentModel =
    selectableModels.find((model) => model.id === selectedModel) ||
    selectableModels[0];

  const handleModelSelect = (model: SelectableModelName) => {
    onModelChange(model);
    onOpenChange(false);
  };

  return (
    <ModelSelector open={open} onOpenChange={onOpenChange}>
      <ModelSelectorTrigger asChild>
        <PromptInputButton
          className={cn(
            "max-w-[9.5rem] min-w-0 gap-1.5 px-2 sm:max-w-[11rem] sm:px-2.5 transition-colors",
            thinkingEnabled
              ? "text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 dark:text-purple-400"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200",
          )}
          title={`Model: ${currentModel.name}`}
        >
          <ModelSelectorLogo
            provider={currentModel.provider}
            className="size-4 shrink-0"
          />
          <span className="min-w-0 truncate text-xs">{currentModel.name}</span>
          <ChevronDown className="size-3 shrink-0" />
        </PromptInputButton>
      </ModelSelectorTrigger>

      <ModelSelectorContent title="Select Model">
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList className="max-h-[min(22rem,60vh)]">
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          <ModelSelectorGroup
            heading="z0 Agent"
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em]"
          >
            {selectableModels.map((model) => (
              <ModelSelectorItem
                key={model.id}
                value={model.id}
                onSelect={() => handleModelSelect(model.id)}
                className={cn(
                  "mx-1.5 my-1 rounded-xl px-3 py-2",
                  selectedModel === model.id && "bg-accent",
                )}
              >
                <ModelSelectorLogo provider={model.provider} className="size-4 shrink-0 text-[9px]" />
                <ModelSelectorName className="min-w-0 flex-1 truncate">
                  {model.name}
                </ModelSelectorName>
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
