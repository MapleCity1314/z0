"use client";

import { type ChatStatus, type FileUIPart } from "ai";
import {
  ArrowLeft,
  ArrowRight,
  BadgePlus,
  Brain,
  ChevronDown,
  Code2,
  FolderOpen,
  Globe,
  GraduationCap,
  Heart,
  Landmark,
  Lightbulb,
  PenSquare,
  PencilLine,
  Plus,
  Server,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { selectableModels, type SelectableModelName } from "@/lib/agent/model";
import { shouldShowErrorToast } from "@/lib/auth-errors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  addChatMcpServerAction,
  addChatSkillAction,
  getChatIntegrationsAction,
  getSystemIntegrationMarketAction,
  setChatMcpServerStateAction,
  setChatSkillStateAction,
  warmChatMcpServersAction,
} from "@/app/(chat)/api/integrations/actions";
import { useUserStore } from "@/store/user";
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
} from "../ai-elements/model-selector";
import {
  PromptInput,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "../ai-elements/prompt-input";
import { Suggestion, Suggestions } from "../ai-elements/suggestion";
import { ProjectBadge, ProjectSelector } from "../ai-elements/project-selector";
import type {
  ConversationMcpServer,
  ConversationSkill,
  SystemMcpMarketItem,
  SystemPluginMarketItem,
  SystemSkillMarketItem,
} from "./integration-market-types";
import { McpServerDialog } from "./mcp-market-dialog";
import { SkillsDialog } from "./skills-market-dialog";
import { Z0PluginsDialog } from "./z0-plugins-dialog";

interface ChatInputProps {
  chatId: string;
  onSubmit: (message: { text: string; files: FileUIPart[] }) => void;
  status: ChatStatus;
  messagesLength: number;
  showWelcome: boolean;
  webSearchEnabled: boolean;
  onWebSearchToggle: () => void;
  thinkingEnabled: boolean;
  onThinkingToggle: () => void;
  studioModeEnabled: boolean;
  selectedModel: SelectableModelName;
  onModelChange: (model: SelectableModelName) => void;
  selectedProjectId?: string | null;
  onProjectChange: (projectId: string | null) => void;
  onStop: () => void;
}

type WelcomeSuggestionCategory =
  | "code"
  | "finance"
  | "learning"
  | "writing"
  | "life"
  | "ideas";

type WelcomePromptTemplate = {
  summary: string;
  prompt: string;
};

const CATEGORY_ICONS: Record<WelcomeSuggestionCategory, typeof Code2> = {
  code: Code2,
  finance: Landmark,
  learning: GraduationCap,
  writing: PenSquare,
  life: Heart,
  ideas: Lightbulb,
};

const WELCOME_SUGGESTIONS: {
  key: WelcomeSuggestionCategory;
  label: string;
  prompts: WelcomePromptTemplate[];
}[] = [
  {
    key: "code",
    label: "Code",
    prompts: [
      {
        summary: "Review my code and improve it",
        prompt:
          "Hi z0! Could you look over my code and give me practical improvement tips? If you need more information, ask me 1-2 key questions right away. Please highlight bugs, architecture issues, readability concerns, and performance risks in priority order. Then give me a concrete fix plan with quick wins first. If useful, create a checklist we can go through together. Use any tools you have access to, like web search, if they help.",
      },
      {
        summary: "Debug this error fast",
        prompt:
          "I need help debugging an issue quickly. Please identify likely root causes, propose the fastest safe fix, and tell me exactly what to check first. If details are missing, ask me only the most critical 1-2 questions. Then provide a step-by-step diagnostic flow I can run immediately.",
      },
      {
        summary: "Refactor for clarity and speed",
        prompt:
          "Please refactor this code for clarity, maintainability, and performance. Show the improved version and explain the main tradeoffs. If there are multiple options, compare them and recommend one default path. Include any risks of regression and what tests I should run.",
      },
      {
        summary: "Design a clean architecture",
        prompt:
          "Help me redesign this feature architecture. I want clear boundaries, good naming, and a structure that scales. Please propose 2 architecture options with pros and cons, pick one, and provide an implementation plan with milestones.",
      },
      {
        summary: "Write tests for this module",
        prompt:
          "Please create a focused test strategy for this module. Prioritize high-risk paths first, then add edge cases. Provide sample test cases, expected outcomes, and a minimal test suite order I can run to gain confidence quickly.",
      },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    prompts: [
      {
        summary: "Analyze this money decision",
        prompt:
          "Help me evaluate this financial decision clearly. State assumptions, upside, downside, and hidden risks. Then give me a simple decision framework and a practical next-step plan. If anything is missing, ask me only the most important 1-2 questions first.",
      },
      {
        summary: "Compare two investments",
        prompt:
          "Please compare these investment options in plain English: expected return, volatility, liquidity, fees, and downside scenarios. End with a recommendation for conservative, balanced, and aggressive profiles so I can choose quickly.",
      },
      {
        summary: "Build my monthly budget",
        prompt:
          "Create a realistic monthly budget plan for me with fixed costs, variable costs, savings targets, and a buffer. Include a lightweight tracking method I can actually stick to and a weekly check-in checklist.",
      },
      {
        summary: "Debt payoff strategy",
        prompt:
          "Design a debt payoff strategy for me. Compare avalanche vs snowball for my case, estimate timeline, and show how much interest I can save. Give me a month-by-month action plan.",
      },
      {
        summary: "Emergency fund roadmap",
        prompt:
          "Help me build an emergency fund roadmap from scratch. Recommend target amount, contribution pace, account type, and what to prioritize if my cash flow is tight.",
      },
    ],
  },
  {
    key: "learning",
    label: "Learning",
    prompts: [
      {
        summary: "Teach me from zero to usable",
        prompt:
          "Teach me this topic from first principles to practical usage. Keep it structured and concise. Build a short learning roadmap with checkpoints, common mistakes, and one practical exercise after each section.",
      },
      {
        summary: "Adaptive quiz mode",
        prompt:
          "Quiz me on this topic and adapt difficulty based on my answers. After each response, tell me exactly what I got right or wrong and what concept I should review next.",
      },
      {
        summary: "7-day study sprint",
        prompt:
          "Turn this material into a 7-day study sprint with daily goals, estimated time, and concrete exercises. Keep each day practical and measurable.",
      },
      {
        summary: "Explain like mentor",
        prompt:
          "Explain this concept like a patient mentor. Use simple examples first, then level up to advanced cases. End with a quick self-test and answer key.",
      },
      {
        summary: "Make a revision sheet",
        prompt:
          "Create a concise revision sheet for this topic with key ideas, formulas or rules, memory hooks, and a last-minute review checklist.",
      },
    ],
  },
  {
    key: "writing",
    label: "Writing",
    prompts: [
      {
        summary: "Rewrite with my tone",
        prompt:
          "Rewrite this message to be clearer, tighter, and more professional while preserving my tone and intent. Show one polished version plus two alternatives with different levels of formality.",
      },
      {
        summary: "Draft + 2 stronger options",
        prompt:
          "Help me draft a strong first version of this writing task, then provide two sharper alternatives. Explain when each version should be used.",
      },
      {
        summary: "Deep edit for impact",
        prompt:
          "Edit this text for structure, flow, and persuasive impact. Point out weak lines, suggest stronger replacements, and provide a revised final version.",
      },
      {
        summary: "Shorten without losing meaning",
        prompt:
          "Compress this text to be much shorter without losing key meaning. Keep the message accurate, smooth, and direct.",
      },
      {
        summary: "Write for busy readers",
        prompt:
          "Rewrite this for busy readers: lead with the key point, make scanning easy, and end with a clear call to action.",
      },
    ],
  },
  {
    key: "life",
    label: "Life",
    prompts: [
      {
        summary: "Plan my week realistically",
        prompt:
          "Help me build a realistic weekly plan. Prioritize what matters, keep workload sustainable, and include recovery time. Give me a simple daily structure and fallback plan if I slip.",
      },
      {
        summary: "Help me choose wisely",
        prompt:
          "I am stuck on a personal decision. Ask me the most important 1-2 questions first, then help me decide using a clear framework with pros, cons, and likely outcomes.",
      },
      {
        summary: "Build a routine that sticks",
        prompt:
          "Design a practical routine I can stick to with low friction. Keep it simple, flexible, and measurable. Include trigger habits and a short weekly review.",
      },
      {
        summary: "Reduce stress plan",
        prompt:
          "Create a practical stress-reduction plan for my current situation. Focus on actions I can do today, this week, and this month.",
      },
      {
        summary: "Fix procrastination loop",
        prompt:
          "Help me break my procrastination loop. Diagnose likely causes, suggest quick interventions, and give me a focused action plan for the next 48 hours.",
      },
    ],
  },
  {
    key: "ideas",
    label: "Ideas",
    prompts: [
      {
        summary: "10 bold ideas, ranked",
        prompt:
          "Brainstorm 10 bold ideas for this problem and rank them by impact, feasibility, and speed to first result. Include one safe bet, one balanced option, and one high-risk high-reward pick.",
      },
      {
        summary: "Creative angles with tradeoffs",
        prompt:
          "Give me multiple creative angles for this concept. For each angle, provide quick pros, cons, and what would make it succeed or fail.",
      },
      {
        summary: "From rough thought to plan",
        prompt:
          "Turn this rough idea into a concrete project plan with clear scope, milestones, and a first-week execution checklist.",
      },
      {
        summary: "Challenge my assumptions",
        prompt:
          "Stress-test this idea. Challenge weak assumptions, identify blind spots, and suggest stronger alternatives with reasoning.",
      },
      {
        summary: "Pick one idea to execute now",
        prompt:
          "Help me choose one idea to execute this week. Compare top candidates, recommend one, and give me a day-by-day launch plan.",
      },
    ],
  },
];

export function ChatInput({
  chatId,
  onSubmit,
  status,
  messagesLength,
  showWelcome,
  webSearchEnabled,
  onWebSearchToggle,
  thinkingEnabled,
  onThinkingToggle,
  studioModeEnabled,
  selectedModel,
  onModelChange,
  selectedProjectId,
  onProjectChange,
  onStop,
}: ChatInputProps) {
  const currentModel =
    selectableModels.find((model) => model.id === selectedModel) ||
    selectableModels[0];

  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [pluginsDialogOpen, setPluginsDialogOpen] = useState(false);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);

  const [mcpServers, setMcpServers] = useState<ConversationMcpServer[]>([]);
  const [skills, setSkills] = useState<ConversationSkill[]>([]);
  const [systemMcpMarket, setSystemMcpMarket] = useState<SystemMcpMarketItem[]>(
    [],
  );
  const [systemSkillMarket, setSystemSkillMarket] = useState<
    SystemSkillMarketItem[]
  >([]);
  const [systemPluginMarket, setSystemPluginMarket] = useState<
    SystemPluginMarketItem[]
  >([]);

  const [mcpName, setMcpName] = useState("");
  const [mcpEndpoint, setMcpEndpoint] = useState("");
  const [skillName, setSkillName] = useState("");
  const [skillDirectory, setSkillDirectory] = useState("");
  const [hidePlaceholderForGhost, setHidePlaceholderForGhost] = useState(false);
  const [mcpWarmState, setMcpWarmState] = useState<
    "idle" | "booting" | "ready" | "error"
  >("idle");
  const [mcpWarmSummary, setMcpWarmSummary] = useState("");
  const user = useUserStore((state) => state.user);

  const showActionError = (message: string) => {
    if (shouldShowErrorToast(message)) {
      toast.error(message);
    }
  };

  const refreshChatIntegrations = async () => {
    if (!user) {
      setMcpServers([]);
      setSkills([]);
      setSystemMcpMarket([]);
      setSystemSkillMarket([]);
      setSystemPluginMarket([]);
      setIntegrationsLoading(false);
      return;
    }

    setIntegrationsLoading(true);
    const [chatResult, marketResult] = await Promise.all([
      getChatIntegrationsAction(chatId),
      getSystemIntegrationMarketAction(),
    ]);
    setIntegrationsLoading(false);

    if (!chatResult.success || !chatResult.data) {
      showActionError(chatResult.message);
      return;
    }

    setMcpServers(
      chatResult.data.mcpServers.map((item) => ({
        userMcpServerId: item.userMcpServerId,
        systemServerId: item.systemServerId,
        name: item.systemServerName,
        endpoint: item.endpoint,
        sourceType: item.sourceType,
        useInCurrentChat: item.enabledInChat,
        useByDefault: item.useByDefault,
      })),
    );
    setSkills(
      chatResult.data.skills.map((item) => ({
        userSkillId: item.userSkillId,
        systemSkillId: item.systemSkillId,
        name: item.systemSkillName,
        directory: item.directory,
        sourceType: item.sourceType,
        useInCurrentChat: item.enabledInChat,
        useByDefault: item.useByDefault,
      })),
    );

    if (marketResult.success && marketResult.data) {
      setSystemMcpMarket(
        marketResult.data.mcpServers.map((item) => ({
          systemServerId: item.systemServerId,
          name: item.name,
          endpoint: item.endpoint,
          sourceType: item.sourceType,
        })),
      );
      setSystemSkillMarket(
        marketResult.data.skills.map((item) => ({
          systemSkillId: item.systemSkillId,
          name: item.name,
          directory: item.directory,
          sourceType: item.sourceType,
        })),
      );
      setSystemPluginMarket(marketResult.data.plugins);
    } else {
      showActionError(marketResult.message);
    }
  };

  useEffect(() => {
    setMcpDialogOpen(false);
    setSkillsDialogOpen(false);
    setPluginsDialogOpen(false);
    setMcpName("");
    setMcpEndpoint("");
    setSkillName("");
    setSkillDirectory("");
    void refreshChatIntegrations();
  }, [chatId, user]);

  const enabledMcpCount = useMemo(
    () => mcpServers.filter((server) => server.useInCurrentChat).length,
    [mcpServers],
  );
  const enabledSkillsCount = useMemo(
    () => skills.filter((skill) => skill.useInCurrentChat).length,
    [skills],
  );
  const plannedPluginsCount = useMemo(
    () =>
      systemPluginMarket.filter((plugin) => plugin.status === "planned").length,
    [systemPluginMarket],
  );
  const mcpWarmTargets = useMemo(() => {
    const targets = mcpServers.filter((server) =>
      showWelcome ? server.useByDefault : server.useInCurrentChat,
    );

    return targets.map((server) => ({
      id: server.systemServerId,
      name: server.name,
      endpoint: server.endpoint,
    }));
  }, [mcpServers, showWelcome]);
  const mcpWarmSignature = useMemo(
    () =>
      mcpWarmTargets
        .map((server) => `${server.id}:${server.endpoint}`)
        .sort()
        .join("|"),
    [mcpWarmTargets],
  );

  const toggleRowClassName =
    "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800";

  useEffect(() => {
    if (!user) {
      setMcpWarmState("idle");
      setMcpWarmSummary("");
      return;
    }

    if (mcpWarmTargets.length === 0) {
      setMcpWarmState("idle");
      setMcpWarmSummary("");
      return;
    }

    let cancelled = false;
    setMcpWarmState("booting");
    setMcpWarmSummary(
      `Booting ${mcpWarmTargets.length} MCP server${mcpWarmTargets.length > 1 ? "s" : ""}...`,
    );

    void (async () => {
      const result = await warmChatMcpServersAction({
        chatId,
        servers: mcpWarmTargets,
      });

      if (cancelled) {
        return;
      }

      if (!result.success || !result.data) {
        setMcpWarmState("error");
        setMcpWarmSummary("MCP boot failed");
        return;
      }

      if (result.data.failed > 0) {
        setMcpWarmState("error");
        setMcpWarmSummary(
          `${result.data.ready}/${result.data.total} MCP ready`,
        );
        return;
      }

      setMcpWarmState("ready");
      setMcpWarmSummary(
        `${result.data.ready}/${result.data.total} MCP ready`,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [chatId, user, mcpWarmSignature]);

  const addMcpServer = () => {
    const name = mcpName.trim();
    const endpoint = mcpEndpoint.trim();
    if (!name || !endpoint) return;

    void (async () => {
      const result = await addChatMcpServerAction({ chatId, name, endpoint });
      if (!result.success) {
        showActionError(result.message);
        return;
      }
      setMcpName("");
      setMcpEndpoint("");
      await refreshChatIntegrations();
    })();
  };

  const addSkill = () => {
    const name = skillName.trim();
    const directory = skillDirectory.trim();
    if (!name || !directory) return;

    void (async () => {
      const result = await addChatSkillAction({ chatId, name, directory });
      if (!result.success) {
        showActionError(result.message);
        return;
      }
      setSkillName("");
      setSkillDirectory("");
      await refreshChatIntegrations();
    })();
  };

  return (
    <PromptInputProvider>
      <div className="relative">
        <PromptInput
          onSubmit={onSubmit}
          className={cn(
            !showWelcome && "shadow-2xl shadow-zinc-200/50 dark:shadow-black/80",
          )}
          accept="image/*"
          multiple
        >
          <PromptInputHeader>
            {studioModeEnabled && selectedProjectId && (
              <ProjectBadge
                selectedProjectId={selectedProjectId}
                onRemove={() => onProjectChange(null)}
              />
            )}
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>

          <PromptInputBody>
            <PromptInputTextarea
              placeholder={
                hidePlaceholderForGhost
                  ? ""
                  : showWelcome
                    ? "Send a message to z0 Agent"
                    : "Ask z0 Agent to build..."
              }
            />

            <PromptInputFooter>
              <PromptInputTools>
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
                      <Switch
                        checked={webSearchEnabled}
                        className="pointer-events-none"
                      />
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
                      <Switch
                        checked={thinkingEnabled}
                        className="pointer-events-none"
                      />
                    </div>

                    <div className="mt-2 border-zinc-200 border-t pt-2 dark:border-zinc-800">
                      <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                        Integrations
                      </p>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={() => setMcpDialogOpen(true)}
                      >
                        <span className="flex items-center gap-2">
                          <Server className="size-4" />
                          MCP Servers
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
                        onClick={() => setSkillsDialogOpen(true)}
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="size-4" />
                          Agent Skills
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
                        onClick={() => setPluginsDialogOpen(true)}
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
                            {selectedProjectId
                              ? "Switch project"
                              : "Choose project"}
                          </button>
                        </ProjectSelector>
                      </div>
                    )}
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>

                <ModelSelector>
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
                      <span className="hidden text-xs sm:inline">
                        {currentModel.name}
                      </span>
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
                            onSelect={() => onModelChange(model.id)}
                            className={cn(
                              selectedModel === model.id && "bg-accent",
                            )}
                          >
                            <ModelSelectorLogo provider={model.provider} />
                            <ModelSelectorName>{model.name}</ModelSelectorName>
                          </ModelSelectorItem>
                        ))}
                      </ModelSelectorGroup>
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              </PromptInputTools>

              <div className="flex items-center gap-2">
                <UploadAttachmentButton />
                <PromptInputSubmit
                  status={status}
                  disabled={
                    status === "submitted" ||
                    (!messagesLength && status === "streaming")
                  }
                  onClick={() => {
                    if (status === "streaming") {
                      onStop();
                    }
                  }}
                />
              </div>
            </PromptInputFooter>
          </PromptInputBody>
        </PromptInput>

        <WelcomeSuggestions
          showWelcome={showWelcome}
          status={status}
          onSubmit={onSubmit}
          onGhostVisibleChange={setHidePlaceholderForGhost}
        />
      </div>

      <McpServerDialog
        open={mcpDialogOpen}
        onOpenChange={setMcpDialogOpen}
        mcpName={mcpName}
        mcpEndpoint={mcpEndpoint}
        onMcpNameChange={setMcpName}
        onMcpEndpointChange={setMcpEndpoint}
        onAddMcpServer={addMcpServer}
        loading={integrationsLoading}
        servers={mcpServers}
        warmState={mcpWarmState}
        warmSummary={mcpWarmSummary}
        marketServers={systemMcpMarket}
        onQuickAddFromMarket={async (marketItem) => {
          const result = await addChatMcpServerAction({
            chatId,
            name: marketItem.name,
            endpoint: marketItem.endpoint,
          });
          if (!result.success) {
            showActionError(result.message);
            return;
          }
          toast.success(`已添加 MCP：${marketItem.name}`);
          await refreshChatIntegrations();
        }}
        onServersChange={async (nextServer) => {
          const result = await setChatMcpServerStateAction({
            chatId,
            userMcpServerId: nextServer.userMcpServerId,
            enabledInChat: nextServer.useInCurrentChat,
            useByDefault: nextServer.useByDefault,
          });
          if (!result.success) {
            showActionError(result.message);
            return;
          }
          setMcpServers((prev) =>
            prev.map((item) =>
              item.userMcpServerId === nextServer.userMcpServerId
                ? nextServer
                : item,
            ),
          );
        }}
      />

      <SkillsDialog
        open={skillsDialogOpen}
        onOpenChange={setSkillsDialogOpen}
        skillName={skillName}
        skillDirectory={skillDirectory}
        onSkillNameChange={setSkillName}
        onSkillDirectoryChange={setSkillDirectory}
        onAddSkill={addSkill}
        loading={integrationsLoading}
        skills={skills}
        marketSkills={systemSkillMarket}
        onQuickAddFromMarket={async (marketItem) => {
          const result = await addChatSkillAction({
            chatId,
            name: marketItem.name,
            directory: marketItem.directory,
          });
          if (!result.success) {
            showActionError(result.message);
            return;
          }
          toast.success(`已添加 Skill：${marketItem.name}`);
          await refreshChatIntegrations();
        }}
        onSkillsChange={async (nextSkill) => {
          const result = await setChatSkillStateAction({
            chatId,
            userSkillId: nextSkill.userSkillId,
            enabledInChat: nextSkill.useInCurrentChat,
            useByDefault: nextSkill.useByDefault,
          });
          if (!result.success) {
            showActionError(result.message);
            return;
          }
          setSkills((prev) =>
            prev.map((item) =>
              item.userSkillId === nextSkill.userSkillId ? nextSkill : item,
            ),
          );
        }}
      />

      <Z0PluginsDialog
        open={pluginsDialogOpen}
        onOpenChange={setPluginsDialogOpen}
        plugins={systemPluginMarket}
      />
    </PromptInputProvider>
  );
}

function WelcomeSuggestions({
  showWelcome,
  status,
  onSubmit,
  onGhostVisibleChange,
}: {
  showWelcome: boolean;
  status: ChatStatus;
  onSubmit: (message: { text: string; files: FileUIPart[] }) => void;
  onGhostVisibleChange: (visible: boolean) => void;
}) {
  const controller = usePromptInputController();
  const [activeCategory, setActiveCategory] =
    useState<WelcomeSuggestionCategory | null>(null);
  const [ghostText, setGhostText] = useState("");

  if (!showWelcome) {
    return null;
  }

  const isInputEmpty = controller.textInput.value.trim().length === 0;
  const shouldShowGhost = isInputEmpty && ghostText.length > 0;
  const activeConfig = WELCOME_SUGGESTIONS.find(
    (item) => item.key === activeCategory,
  );

  const handleSendPrompt = (prompt: string) => {
    setGhostText("");
    setActiveCategory(null);
    controller.textInput.clear();
    onSubmit({ text: prompt, files: [] });
  };

  useEffect(() => {
    onGhostVisibleChange(shouldShowGhost);
    return () => onGhostVisibleChange(false);
  }, [onGhostVisibleChange, shouldShowGhost]);

  return (
    <div className="pointer-events-none absolute left-0 right-0 bottom-full mb-2 md:static md:mt-3 md:mb-0 md:pointer-events-auto">
      <div className="pointer-events-none absolute top-2 left-6 right-6 z-10 hidden md:block">
        <div
          className={cn(
            "relative h-10 overflow-hidden transition-opacity duration-150",
            shouldShowGhost ? "opacity-100" : "opacity-0",
          )}
        >
          <p className="h-10 leading-10 text-sm text-zinc-400 dark:text-zinc-500 whitespace-nowrap pr-14">
            {ghostText}
          </p>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent dark:from-zinc-900" />
        </div>
      </div>

      <div className="relative md:h-[220px]">
        <div
          className={cn(
            "pointer-events-auto transition-opacity duration-150 md:absolute md:inset-0",
            activeConfig ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
        >
          <Suggestions className="h-full justify-center gap-3 px-1">
            {WELCOME_SUGGESTIONS.map((item) => (
              <Suggestion
                key={item.key}
                suggestion={item.label}
                className="h-7"
                onClick={() => setActiveCategory(item.key)}
                disabled={status === "submitted" || status === "streaming"}
              >
                <span className="inline-flex items-center gap-1.5">
                  {(() => {
                    const Icon = CATEGORY_ICONS[item.key];
                    return <Icon className="size-3.5" />;
                  })()}
                  <span>{item.label}</span>
                </span>
              </Suggestion>
            ))}
          </Suggestions>
        </div>

        <div
          className={cn(
            "pointer-events-auto absolute left-0 right-0 bottom-full mb-2 max-h-[50vh] rounded-2xl border border-zinc-200/90 bg-white/95 p-2.5 shadow-sm transition-opacity duration-150 dark:border-zinc-800 dark:bg-zinc-900/95 md:inset-x-0 md:top-0 md:bottom-0 md:mb-0 md:max-h-none",
            activeConfig ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          onMouseLeave={() => setGhostText("")}
        >
          <div className="mb-1 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              onClick={() => {
                setActiveCategory(null);
                setGhostText("");
              }}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <span className="text-base font-medium text-zinc-700 dark:text-zinc-200">
              {activeConfig?.label}
            </span>
          </div>

          <div className="h-[176px] overflow-auto pr-1">
            <div className="space-y-1">
              {activeConfig?.prompts.map((item) => (
                <SuggestionPromptItem
                  key={item.summary}
                  category={activeConfig.key}
                  summary={item.summary}
                  prompt={item.prompt}
                  onHoverChange={setGhostText}
                  onSelect={handleSendPrompt}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionPromptItem({
  category,
  summary,
  prompt,
  onHoverChange,
  onSelect,
}: {
  category: WelcomeSuggestionCategory;
  summary: string;
  prompt: string;
  onHoverChange: (text: string) => void;
  onSelect: (prompt: string) => void;
}) {
  const Icon = CATEGORY_ICONS[category];

  return (
    <button
      type="button"
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      onMouseEnter={() => onHoverChange(prompt)}
      onFocus={() => onHoverChange(prompt)}
      onMouseLeave={() => onHoverChange("")}
      onBlur={() => onHoverChange("")}
      onClick={() => onSelect(prompt)}
    >
      <span className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
        <span className="line-clamp-1 flex-1">{summary}</span>
        <ArrowRight className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
      </span>
    </button>
  );
}

function UploadAttachmentButton() {
  const { attachments } = usePromptInputController();

  return (
    <PromptInputButton
      onClick={attachments.openFileDialog}
      title="Upload file"
      aria-label="Upload file"
    >
      <Upload className="size-4" />
    </PromptInputButton>
  );
}
