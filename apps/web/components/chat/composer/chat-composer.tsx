"use client";

import { type ChatStatus, type FileUIPart } from "ai";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addChatMcpServerAction,
  addChatSkillAction,
  addUserMcpServerAction,
  addUserSkillAction,
  getChatIntegrationsAction,
  getSystemIntegrationMarketAction,
  getUserIntegrationSettingsAction,
  setUserMcpDefaultAction,
  setUserSkillDefaultAction,
  setChatMcpServerStateAction,
  setChatSkillStateAction,
  warmChatMcpServersAction,
} from "@/app/(chat)/api/integrations/actions";
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { ProjectBadge } from "@/components/ai-elements/project-selector";
import type {
  ConversationMcpServer,
  ConversationSkill,
  SystemMcpMarketItem,
  SystemPluginMarketItem,
  SystemSkillMarketItem,
} from "@/lib/chat";
import { type SelectableModelName } from "@/lib/agent/model";
import { shouldShowErrorToast } from "@/lib/auth-errors";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import { McpServerDialog } from "../mcp-market-dialog";
import { SkillsDialog } from "../skills-market-dialog";
import { Z0PluginsDialog } from "../z0-plugins-dialog";
import { FeatureMenu } from "./controls/feature-menu";
import { ModelPicker } from "./controls/model-picker";
import { UploadAttachmentButton } from "./controls/upload-attachment-button";
import { WelcomeSuggestions } from "./welcome-suggestions";

interface ChatComposerProps {
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

type McpWarmStatusItem = {
  state: "booting" | "ready" | "error";
  summary?: string;
};

const getMcpWarmStatusKey = (server: { name: string; endpoint: string }) =>
  `${server.name}::${server.endpoint}`;

const supportsMcpWarmup = (endpoint: string) =>
  endpoint.startsWith("http://") ||
  endpoint.startsWith("https://") ||
  endpoint.startsWith("npm:");

export function ChatComposer({
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
}: ChatComposerProps) {
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [pluginsDialogOpen, setPluginsDialogOpen] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
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
  const [mcpWarmStatuses, setMcpWarmStatuses] = useState<
    Record<string, McpWarmStatusItem>
  >({});
  const user = useUserStore((state) => state.user);
  const pathname = usePathname();
  const router = useRouter();

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
    const [integrationsResult, marketResult] = await Promise.all([
      showWelcome
        ? getUserIntegrationSettingsAction()
        : getChatIntegrationsAction(chatId),
      getSystemIntegrationMarketAction(),
    ]);
    setIntegrationsLoading(false);

    if (!integrationsResult.success || !integrationsResult.data) {
      showActionError(integrationsResult.message);
      return;
    }

    setMcpServers(
      integrationsResult.data.mcpServers.map((item) => ({
        userMcpServerId: item.userMcpServerId,
        systemServerId: item.systemServerId,
        name: item.systemServerName,
        endpoint: item.endpoint,
        sourceType: item.sourceType,
        useInCurrentChat: showWelcome ? item.useByDefault : item.enabledInChat,
        useByDefault: item.useByDefault,
        connectorSlug: item.connectorSlug,
        requiresAuth: item.requiresAuth,
        authProvider: item.authProvider,
        authStatus: item.authStatus,
        privacyLevel: item.privacyLevel,
        connectedAt: item.connectedAt,
        consentGrantedAt: item.consentGrantedAt,
      })),
    );
    setSkills(
      integrationsResult.data.skills.map((item) => ({
        userSkillId: item.userSkillId,
        systemSkillId: item.systemSkillId,
        name: item.systemSkillName,
        directory: item.directory,
        sourceType: item.sourceType,
        useInCurrentChat: showWelcome ? item.useByDefault : item.enabledInChat,
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
          slug: item.slug,
          icon: item.icon,
          category: item.category,
          provider: item.provider,
          shortDescription: item.shortDescription,
          setupLabel: item.setupLabel,
          docsUrl: item.docsUrl,
          tags: item.tags,
          recommended: item.recommended,
          requiresSetup: item.requiresSetup,
          requiresAuth: item.requiresAuth,
          authProvider: item.authProvider,
          privacyLevel: item.privacyLevel,
          consentRequired: item.consentRequired,
          scopes: item.scopes,
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
  }, [chatId, user, showWelcome]);

  const plannedPluginsCount = useMemo(
    () =>
      systemPluginMarket.filter((plugin) => plugin.status === "planned").length,
    [systemPluginMarket],
  );
  const mcpWarmTargets = useMemo(() => {
    const targets = mcpServers.filter((server) =>
      (showWelcome ? server.useByDefault : server.useInCurrentChat) &&
      supportsMcpWarmup(server.endpoint),
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

  useEffect(() => {
    if (!user) {
      setMcpWarmState("idle");
      setMcpWarmSummary("");
      setMcpWarmStatuses({});
      return;
    }

    if (mcpWarmTargets.length === 0) {
      setMcpWarmState("idle");
      setMcpWarmSummary("");
      setMcpWarmStatuses({});
      return;
    }

    let cancelled = false;
    setMcpWarmState("booting");
    setMcpWarmSummary(
      `Booting ${mcpWarmTargets.length} MCP server${mcpWarmTargets.length > 1 ? "s" : ""}...`,
    );
    setMcpWarmStatuses(
      Object.fromEntries(
        mcpWarmTargets.map((server) => [
          getMcpWarmStatusKey(server),
          {
            state: "booting" as const,
            summary: "Booting runtime...",
          },
        ]),
      ),
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
        setMcpWarmStatuses(
          Object.fromEntries(
            mcpWarmTargets.map((server) => [
              getMcpWarmStatusKey(server),
              {
                state: "error" as const,
                summary: "Boot failed",
              },
            ]),
          ),
        );
        return;
      }

      setMcpWarmStatuses(
        Object.fromEntries(
          result.data.results.map((item) => [
            getMcpWarmStatusKey(item),
            {
              state: item.success ? "ready" : "error",
              summary: item.success
                ? `${item.toolCount} tool${item.toolCount === 1 ? "" : "s"} ready`
                : item.error || "Warm failed",
            },
          ]),
        ),
      );

      if (result.data.failed > 0) {
        setMcpWarmState("error");
        setMcpWarmSummary(`${result.data.ready}/${result.data.total} MCP ready`);
        return;
      }

      setMcpWarmState("ready");
      setMcpWarmSummary(`${result.data.ready}/${result.data.total} MCP ready`);
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
      const result = showWelcome
        ? await addUserMcpServerAction({ name, endpoint })
        : await addChatMcpServerAction({ chatId, name, endpoint });
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
      const result = showWelcome
        ? await addUserSkillAction({ name, directory })
        : await addChatSkillAction({ chatId, name, directory });
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
                <FeatureMenu
                  webSearchEnabled={webSearchEnabled}
                  thinkingEnabled={thinkingEnabled}
                  onWebSearchToggle={onWebSearchToggle}
                  onThinkingToggle={onThinkingToggle}
                  studioModeEnabled={studioModeEnabled}
                  selectedProjectId={selectedProjectId}
                  onProjectChange={onProjectChange}
                  onOpenMcpDialog={() => setMcpDialogOpen(true)}
                  onOpenSkillsDialog={() => setSkillsDialogOpen(true)}
                  onOpenPluginsDialog={() => setPluginsDialogOpen(true)}
                  mcpServers={mcpServers}
                  skills={skills}
                  plannedPluginsCount={plannedPluginsCount}
                  mcpWarmState={mcpWarmState}
                  showWelcome={showWelcome}
                />

                <ModelPicker
                  open={modelSelectorOpen}
                  onOpenChange={setModelSelectorOpen}
                  selectedModel={selectedModel}
                  thinkingEnabled={thinkingEnabled}
                  onModelChange={onModelChange}
                />
              </PromptInputTools>

              <div className="flex items-center gap-2">
                <UploadAttachmentButton />
                <PromptInputSubmit
                  status={status}
                  type={status === "streaming" ? "button" : "submit"}
                  disabled={
                    status === "submitted" ||
                    (!messagesLength && status === "streaming")
                  }
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    if (status === "streaming") {
                      event.preventDefault();
                      event.stopPropagation();
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
        showWelcome={showWelcome}
        mcpName={mcpName}
        mcpEndpoint={mcpEndpoint}
        onMcpNameChange={setMcpName}
        onMcpEndpointChange={setMcpEndpoint}
        onAddMcpServer={addMcpServer}
        loading={integrationsLoading}
        servers={mcpServers}
        warmState={mcpWarmState}
        warmSummary={mcpWarmSummary}
        warmStatuses={mcpWarmStatuses}
        marketServers={systemMcpMarket}
        onQuickAddFromMarket={async (marketItem) => {
          if (marketItem.requiresAuth) {
            router.push(
              `/connectors/${marketItem.slug}?chatId=${encodeURIComponent(
                chatId,
              )}&returnTo=${encodeURIComponent(pathname || "/")}`,
            );
            return;
          }
          const result = showWelcome
            ? await addUserMcpServerAction({
                name: marketItem.name,
                endpoint: marketItem.endpoint,
                sourceType: marketItem.sourceType,
              })
            : await addChatMcpServerAction({
                chatId,
                name: marketItem.name,
                endpoint: marketItem.endpoint,
                sourceType: marketItem.sourceType,
              });
          if (!result.success) {
            showActionError(result.message);
            return;
          }
          toast.success(`已添加 MCP：${marketItem.name}`);
          await refreshChatIntegrations();
        }}
        onServersChange={async (nextServer) => {
          const previousServer =
            mcpServers.find(
              (item) => item.userMcpServerId === nextServer.userMcpServerId,
            ) ?? null;

          setMcpServers((prev) =>
            prev.map((item) =>
              item.userMcpServerId === nextServer.userMcpServerId
                ? nextServer
                : item,
            ),
          );

          const result = showWelcome
            ? await setUserMcpDefaultAction({
                userMcpServerId: nextServer.userMcpServerId,
                useByDefault: nextServer.useByDefault,
              })
            : await setChatMcpServerStateAction({
                chatId,
                userMcpServerId: nextServer.userMcpServerId,
                enabledInChat: nextServer.useInCurrentChat,
                useByDefault: nextServer.useByDefault,
              });
          if (!result.success) {
            if (previousServer) {
              setMcpServers((prev) =>
                prev.map((item) =>
                  item.userMcpServerId === previousServer.userMcpServerId
                    ? previousServer
                    : item,
                ),
              );
            }
            showActionError(result.message);
            return;
          }
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
          const result = showWelcome
            ? await addUserSkillAction({
                name: marketItem.name,
                directory: marketItem.directory,
                sourceType: marketItem.sourceType,
              })
            : await addChatSkillAction({
                chatId,
                name: marketItem.name,
                directory: marketItem.directory,
                sourceType: marketItem.sourceType,
              });
          if (!result.success) {
            showActionError(result.message);
            return;
          }
          toast.success(`已添加 Skill：${marketItem.name}`);
          await refreshChatIntegrations();
        }}
        onSkillsChange={async (nextSkill) => {
          const previousSkill =
            skills.find((item) => item.userSkillId === nextSkill.userSkillId) ??
            null;

          setSkills((prev) =>
            prev.map((item) =>
              item.userSkillId === nextSkill.userSkillId ? nextSkill : item,
            ),
          );

          const result = showWelcome
            ? await setUserSkillDefaultAction({
                userSkillId: nextSkill.userSkillId,
                useByDefault: nextSkill.useByDefault,
              })
            : await setChatSkillStateAction({
                chatId,
                userSkillId: nextSkill.userSkillId,
                enabledInChat: nextSkill.useInCurrentChat,
                useByDefault: nextSkill.useByDefault,
              });
          if (!result.success) {
            if (previousSkill) {
              setSkills((prev) =>
                prev.map((item) =>
                  item.userSkillId === previousSkill.userSkillId
                    ? previousSkill
                    : item,
                ),
              );
            }
            showActionError(result.message);
            return;
          }
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
