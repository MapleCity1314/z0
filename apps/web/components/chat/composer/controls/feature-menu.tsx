"use client";

import {
  BadgePlus,
  Brain,
  FolderOpen,
  Globe,
  PencilLine,
  Plus,
  Server,
  Sparkles,
} from "lucide-react";
import {
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
} from "@/components/ai-elements/prompt-input";
import { ProjectSelector } from "@/components/ai-elements/project-selector";
import { Switch } from "@z0/ui/switch";
import type { ConversationMcpServer, ConversationSkill } from "@/lib/chat";

type FeatureMenuProps = {
  webSearchEnabled: boolean;
  thinkingEnabled: boolean;
  onWebSearchToggle: () => void;
  onThinkingToggle: () => void;
  studioModeEnabled: boolean;
  selectedProjectId?: string | null;
  onProjectChange: (projectId: string | null) => void;
  onOpenMcpDialog: () => void;
  onOpenSkillsDialog: () => void;
  onOpenPluginsDialog: () => void;
  mcpServers: ConversationMcpServer[];
  skills: ConversationSkill[];
  plannedPluginsCount: number;
  mcpWarmState: "idle" | "booting" | "ready" | "error";
  showWelcome: boolean;
};

const toggleRowClassName =
  "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800";

export function FeatureMenu({
  webSearchEnabled,
  thinkingEnabled,
  onWebSearchToggle,
  onThinkingToggle,
  studioModeEnabled,
  selectedProjectId,
  onProjectChange,
  onOpenMcpDialog,
  onOpenSkillsDialog,
  onOpenPluginsDialog,
  mcpServers,
  skills,
  plannedPluginsCount,
  mcpWarmState,
  showWelcome,
}: FeatureMenuProps) {
  const activeMcpServers = mcpServers.filter((server) =>
    showWelcome ? server.useByDefault : server.useInCurrentChat,
  );
  const activeSkills = skills.filter((skill) =>
    showWelcome ? skill.useByDefault : skill.useInCurrentChat,
  );
  const enabledMcpCount = activeMcpServers.length;
  const enabledSkillsCount = activeSkills.length;
  const activeMcpSummary =
    activeMcpServers.length === 0
      ? "No active MCP servers"
      : [
          activeMcpServers
            .slice(0, 2)
            .map((server) => server.name)
            .join(", "),
          activeMcpServers.length > 2
            ? `+${activeMcpServers.length - 2} more`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");
  const activeSkillsSummary =
    activeSkills.length === 0
      ? "No active skills"
      : [
          activeSkills
            .slice(0, 2)
            .map((skill) => skill.name)
            .join(", "),
          activeSkills.length > 2 ? `+${activeSkills.length - 2} more` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <PromptInputActionMenu>
      <PromptInputActionMenuTrigger title="Feature extensions">
        <Plus className="size-4" />
      </PromptInputActionMenuTrigger>
      <PromptInputActionMenuContent className="w-80 p-2">
        <div className="px-2 pb-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Core controls
          </p>
        </div>
        <div
          role="button"
          tabIndex={0}
          className={toggleRowClassName}
          onClick={onWebSearchToggle}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onWebSearchToggle();
            }
          }}
        >
          <span className="flex items-center gap-2">
            <Globe className="size-4" />
            Web search
          </span>
          <Switch checked={webSearchEnabled} className="pointer-events-none" />
        </div>

        <div
          role="button"
          tabIndex={0}
          className={toggleRowClassName}
          onClick={onThinkingToggle}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onThinkingToggle();
            }
          }}
        >
          <span className="flex items-center gap-2">
            <Brain className="size-4" />
            Thinking
          </span>
          <Switch checked={thinkingEnabled} className="pointer-events-none" />
        </div>

        <div className="mt-2 border-zinc-200 border-t pt-2 dark:border-zinc-800">
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Integrations
          </p>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onOpenMcpDialog}
          >
            <span className="flex min-w-0 flex-col items-start">
              <span className="flex items-center gap-2">
                <Server className="size-4" />
                MCP Servers
              </span>
              <span className="max-w-[14rem] truncate pl-6 text-muted-foreground text-xs">
                {activeMcpSummary}
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {enabledMcpCount} active
                {mcpWarmState === "booting"
                  ? " · booting"
                  : mcpWarmState === "ready"
                    ? " · ready"
                    : mcpWarmState === "error"
                      ? " · degraded"
                      : ""}
              </span>
              <PencilLine className="size-4" />
            </span>
          </button>

          <button
            type="button"
            className="mt-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onOpenSkillsDialog}
          >
            <span className="flex min-w-0 flex-col items-start">
              <span className="flex items-center gap-2">
                <Sparkles className="size-4" />
                Agent Skills
              </span>
              <span className="max-w-[14rem] truncate pl-6 text-muted-foreground text-xs">
                {activeSkillsSummary}
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {enabledSkillsCount} active
              </span>
              <PencilLine className="size-4" />
            </span>
          </button>

          <button
            type="button"
            className="mt-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onOpenPluginsDialog}
          >
            <span className="flex items-center gap-2">
              <BadgePlus className="size-4" />
              z0 Plugins
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {plannedPluginsCount} planned
              </span>
              <span className="rounded-full border border-amber-300/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:border-amber-500/30 dark:text-amber-300">
                Experimental
              </span>
              <PencilLine className="size-4" />
            </span>
          </button>
        </div>

        {studioModeEnabled && (
          <div className="mt-2 border-zinc-200 border-t pt-2 dark:border-zinc-800">
            <p className="mb-2 px-2 text-muted-foreground text-xs">
              Select project
            </p>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={onProjectChange}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <FolderOpen className="size-4" />
                {selectedProjectId ? "Switch project" : "Choose project"}
              </button>
            </ProjectSelector>
          </div>
        )}
      </PromptInputActionMenuContent>
    </PromptInputActionMenu>
  );
}
