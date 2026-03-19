"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Blocks } from "lucide-react";
import { toast } from "sonner";
import {
  addUserMcpServerAction,
  addUserSkillAction,
  getSystemIntegrationMarketAction,
  getUserIntegrationSettingsAction,
  setUserMcpDefaultAction,
  setUserSkillDefaultAction,
} from "@/app/(chat)/api/integrations/actions";
import { ChatPageShell } from "@/components/chat/layout";
import type { SystemPluginMarketItem } from "@/lib/chat";
import { CustomizeSidebar, NAV_ITEMS } from "@/components/customize/sidebar";
import {
  ConnectorsSection,
  PluginsSection,
  SkillsSection,
  SubagentsSection,
} from "@/components/customize/sections";
import type {
  ConnectorFormState,
  CustomizeSection,
  SkillFormState,
  SubagentRoleItem,
  UserMcpItem,
  UserSkillItem,
} from "@/components/customize/types";
import { GlassCard } from "@/components/customize/shared";
import { shouldShowErrorToast } from "@/lib/auth-errors";
import { useUserStore } from "@/store/user";

export function CustomizePage() {
  const user = useUserStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<CustomizeSection>("skills");
  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [skills, setSkills] = useState<UserSkillItem[]>([]);
  const [connectors, setConnectors] = useState<UserMcpItem[]>([]);
  const [plugins, setPlugins] = useState<SystemPluginMarketItem[]>([]);
  const [skillForm, setSkillForm] = useState<SkillFormState>({ name: "", dir: "" });
  const [connectorForm, setConnectorForm] = useState<ConnectorFormState>({
    name: "",
    endpoint: "",
  });
  const [savingSkillDefaultId, setSavingSkillDefaultId] = useState<string | null>(null);
  const [savingConnectorDefaultId, setSavingConnectorDefaultId] = useState<string | null>(null);

  const activeNav = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  const showActionError = (message: string) => {
    if (shouldShowErrorToast(message)) {
      toast.error(message);
    }
  };

  const refreshSettings = async () => {
    if (!user) {
      setSkills([]);
      setConnectors([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await getUserIntegrationSettingsAction();
    setLoading(false);

    if (!result.success || !result.data) {
      showActionError(result.message);
      return;
    }

    setConnectors(
      result.data.mcpServers.map((item) => ({
        userMcpServerId: item.userMcpServerId,
        systemServerId: item.systemServerId,
        systemServerName: item.systemServerName,
        endpoint: item.endpoint,
        sourceType: item.sourceType,
        useByDefault: item.useByDefault,
      })),
    );
    setSkills(
      result.data.skills.map((item) => ({
        userSkillId: item.userSkillId,
        systemSkillId: item.systemSkillId,
        systemSkillName: item.systemSkillName,
        directory: item.directory,
        sourceType: item.sourceType,
        useByDefault: item.useByDefault,
      })),
    );
  };

  const refreshMarket = async () => {
    setMarketLoading(true);
    const result = await getSystemIntegrationMarketAction();
    setMarketLoading(false);

    if (!result.success || !result.data) {
      showActionError(result.message);
      return;
    }

    setPlugins(
      result.data.plugins.map((plugin) => ({
        pluginId: plugin.pluginId,
        name: plugin.name,
        status: plugin.status,
        runtimeStatus: plugin.runtimeStatus,
        description: plugin.description,
        highlights: plugin.highlights,
        tools: plugin.tools,
        skills: plugin.skills,
        mcpServers: plugin.mcpServers,
        uiPanels: plugin.uiPanels,
        workflows: plugin.workflows,
        subagentRoles: plugin.subagentRoles,
        dependencies: plugin.dependencies,
      })),
    );
  };

  useEffect(() => {
    void Promise.all([refreshSettings(), refreshMarket()]);
  }, [user]);

  const subagentRoles = useMemo<SubagentRoleItem[]>(() => {
    const uniqueRoles = new Map<string, SubagentRoleItem>();

    for (const plugin of plugins) {
      for (const role of plugin.subagentRoles) {
        uniqueRoles.set(role, {
          role,
          pluginId: plugin.pluginId,
          pluginName: plugin.name,
          status: plugin.status,
        });
      }
    }

    return Array.from(uniqueRoles.values());
  }, [plugins]);

  const sectionStatus = useMemo(() => {
    if (activeTab === "skills") {
      return `${skills.filter((item) => item.useByDefault).length} default skills`;
    }
    if (activeTab === "connectors") {
      return `${connectors.filter((item) => item.useByDefault).length} default connectors`;
    }
    if (activeTab === "plugins") {
      return `${plugins.filter((item) => item.status === "planned").length} planned plugin families`;
    }
    return `${subagentRoles.length} specialist roles`;
  }, [activeTab, connectors, plugins, skills, subagentRoles]);

  const handleAddSkill = async () => {
    const name = skillForm.name.trim();
    const directory = skillForm.dir.trim();
    if (!name || !directory) return;

    const result = await addUserSkillAction({ name, directory });
    if (!result.success) {
      showActionError(result.message);
      return;
    }

    setSkillForm({ name: "", dir: "" });
    toast.success("Skill added");
    await refreshSettings();
  };

  const handleAddConnector = async () => {
    const name = connectorForm.name.trim();
    const endpoint = connectorForm.endpoint.trim();
    if (!name || !endpoint) return;

    const result = await addUserMcpServerAction({ name, endpoint });
    if (!result.success) {
      showActionError(result.message);
      return;
    }

    setConnectorForm({ name: "", endpoint: "" });
    toast.success("Connector added");
    await refreshSettings();
  };

  return (
    <ChatPageShell className="dark:text-zinc-200" innerClassName="mx-auto flex min-h-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-4 pt-16 lg:flex-row lg:px-6 lg:pb-6 lg:pt-20">
          <aside className="w-full lg:w-80 lg:shrink-0">
            <CustomizeSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              stats={{
                skills: skills.length,
                connectors: connectors.length,
                plugins: plugins.length,
                subagents: subagentRoles.length,
              }}
            />
          </aside>

          <section className="relative min-h-0 flex-1">
            <GlassCard className="flex h-full min-h-[640px] flex-col p-0">
              <div className="border-b border-zinc-200/70 px-6 py-6 dark:border-white/5 md:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                      Customize / {activeNav.label}
                    </p>
                    <h2 className="mt-2 text-3xl font-medium tracking-tight text-zinc-950 dark:text-white">
                      {activeNav.label}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                      {activeNav.description}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/70 bg-white/75 px-4 py-2 text-xs font-medium text-zinc-600 dark:border-white/5 dark:bg-white/5 dark:text-zinc-300">
                    <Blocks className="size-3.5 text-zinc-500 dark:text-zinc-400" />
                    {sectionStatus}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  >
                    {activeTab === "skills" ? (
                      <SkillsSection
                        loading={loading}
                        skills={skills}
                        formState={skillForm}
                        setFormState={setSkillForm}
                        savingSkillDefaultId={savingSkillDefaultId}
                        onAdd={() => void handleAddSkill()}
                        onToggleDefault={(userSkillId, next) => {
                          setSavingSkillDefaultId(userSkillId);
                          void (async () => {
                            const result = await setUserSkillDefaultAction({
                              userSkillId,
                              useByDefault: next,
                            });
                            setSavingSkillDefaultId(null);
                            if (!result.success) {
                              showActionError(result.message);
                              return;
                            }
                            setSkills((current) =>
                              current.map((item) =>
                                item.userSkillId === userSkillId
                                  ? { ...item, useByDefault: next }
                                  : item,
                              ),
                            );
                          })();
                        }}
                      />
                    ) : null}

                    {activeTab === "connectors" ? (
                      <ConnectorsSection
                        loading={loading}
                        connectors={connectors}
                        formState={connectorForm}
                        setFormState={setConnectorForm}
                        savingConnectorDefaultId={savingConnectorDefaultId}
                        onAdd={() => void handleAddConnector()}
                        onToggleDefault={(userMcpServerId, next) => {
                          setSavingConnectorDefaultId(userMcpServerId);
                          void (async () => {
                            const result = await setUserMcpDefaultAction({
                              userMcpServerId,
                              useByDefault: next,
                            });
                            setSavingConnectorDefaultId(null);
                            if (!result.success) {
                              showActionError(result.message);
                              return;
                            }
                            setConnectors((current) =>
                              current.map((item) =>
                                item.userMcpServerId === userMcpServerId
                                  ? { ...item, useByDefault: next }
                                  : item,
                              ),
                            );
                          })();
                        }}
                      />
                    ) : null}

                    {activeTab === "plugins" ? (
                      <PluginsSection loading={marketLoading} plugins={plugins} />
                    ) : null}

                    {activeTab === "subagents" ? (
                      <SubagentsSection
                        loading={marketLoading}
                        subagentRoles={subagentRoles}
                      />
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>
            </GlassCard>
          </section>
    </ChatPageShell>
  );
}
