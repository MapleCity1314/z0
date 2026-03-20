"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Blocks } from "lucide-react";
import { ChatPageShell } from "@/components/chat/layout";
import { NAV_ITEMS } from "@/components/customize/nav";
import { CustomizeSidebar } from "@/components/customize/sidebar";
import {
  ConnectorsSection,
  PluginsSection,
  SkillsSection,
  SubagentsSection,
} from "@/components/customize/sections";
import type {
  CustomizeSection,
} from "@/components/customize/types";
import { GlassCard } from "@/components/customize/shared";
import { useCustomizeData } from "@/components/customize/use-customize-data";

export function CustomizePage() {
  const [activeTab, setActiveTab] = useState<CustomizeSection>("skills");
  const {
    connectorForm,
    connectors,
    disconnectConnector,
    disconnectingConnectorId,
    handleAddConnector,
    handleAddSkill,
    loading,
    marketLoading,
    plugins,
    savingConnectorDefaultId,
    savingSkillDefaultId,
    sectionStatus,
    setConnectorForm,
    setSkillForm,
    skillForm,
    skills,
    subagentRoles,
    toggleConnectorDefault,
    toggleSkillDefault,
  } = useCustomizeData(activeTab);

  const activeNav = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

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
                        onToggleDefault={(userSkillId, next) =>
                          void toggleSkillDefault(userSkillId, next)
                        }
                      />
                    ) : null}

                    {activeTab === "connectors" ? (
                      <ConnectorsSection
                        loading={loading}
                        connectors={connectors}
                        formState={connectorForm}
                        setFormState={setConnectorForm}
                        disconnectingConnectorId={disconnectingConnectorId}
                        savingConnectorDefaultId={savingConnectorDefaultId}
                        onAdd={() => void handleAddConnector()}
                        onDisconnect={(userMcpServerId) =>
                          void disconnectConnector(userMcpServerId)
                        }
                        onToggleDefault={(userMcpServerId, next) =>
                          void toggleConnectorDefault(userMcpServerId, next)
                        }
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
