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
            "gap-1.5 px-2 transition-colors",
            thinkingEnabled
              ? "text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 dark:text-purple-400"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200",
          )}
          title={`Model: ${currentModel.name}`}
        >
          <ModelSelectorLogo
            provider={currentModel.provider}
            className="size-4"
          />
          <span className="hidden text-xs sm:inline">{currentModel.name}</span>
          <ChevronDown className="size-3" />
        </PromptInputButton>
      </ModelSelectorTrigger>

      <ModelSelectorContent title="Select Model">
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          <ModelSelectorGroup heading="z0 Agent">
            {selectableModels.map((model) => (
              <ModelSelectorItem
                key={model.id}
                value={model.id}
                onSelect={() => handleModelSelect(model.id)}
                className={cn(selectedModel === model.id && "bg-accent")}
              >
                <ModelSelectorLogo provider={model.provider} />
                <ModelSelectorName>{model.name}</ModelSelectorName>
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
