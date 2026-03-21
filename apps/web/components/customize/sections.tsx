"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Bot,
  Cable,
  Loader2,
  Plus,
  PlugZap,
  Server,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { SystemPluginMarketItem } from "@/lib/chat";
import {
  CapabilityPill,
  CardGrid,
  ComposerCard,
  ConnectorCard,
  EmptyStateCard,
  itemMotion,
  LoadingCard,
  MarketConnectorCard,
  MarketSkillCard,
  summarizePluginCapabilities,
  ToggleCard,
} from "@/components/customize/cards";
import {
  resolveServiceMarkKey,
  ServiceMark,
} from "@/components/integrations/service-mark";
import { GlassCard, PillInput } from "@/components/customize/shared";
import type {
  ConnectorFormState,
  MarketConnectorItem,
  MarketSkillItem,
  SkillFormState,
  SubagentRoleItem,
  UserMcpItem,
  UserSkillItem,
} from "@/components/customize/types";

export function SkillsSection({
  loading,
  skills,
  marketSkills,
  onAdd,
  onAddMarketSkill,
  onToggleDefault,
  formState,
  setFormState,
  savingSkillDefaultId,
}: {
  loading: boolean;
  skills: UserSkillItem[];
  marketSkills: MarketSkillItem[];
  onAdd: () => void;
  onAddMarketSkill: (skill: MarketSkillItem) => void;
  onToggleDefault: (userSkillId: string, next: boolean) => void;
  formState: SkillFormState;
  setFormState: (next: SkillFormState) => void;
  savingSkillDefaultId: string | null;
}) {
  return (
    <div className="space-y-8">
      <ComposerCard
        icon={Sparkles}
        title="Create New Skill"
        description="Define reusable procedures and prompt surfaces for the agent."
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <PillInput
            placeholder="Skill Name"
            value={formState.name}
            onChange={(event) => setFormState({ ...formState, name: event.target.value })}
          />
          <PillInput
            placeholder=".agents/skills/path"
            value={formState.dir}
            onChange={(event) => setFormState({ ...formState, dir: event.target.value })}
          />
          <button
            type="button"
            onClick={onAdd}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 font-semibold text-black transition-transform active:scale-95"
          >
            <Plus className="size-4" />
            Add
          </button>
        </div>
      </ComposerCard>

      <CardGrid>
        <AnimatePresence mode="popLayout">
          {loading ? <LoadingCard key="skills-loading" label="Loading skills" /> : null}
          {!loading && skills.length === 0 ? (
            <EmptyStateCard
              key="skills-empty"
              icon={Sparkles}
              title="No skills yet"
              description="Create your first reusable operating procedure."
            />
          ) : null}
          {!loading
            ? skills.map((skill) => {
                const serviceKey = resolveServiceMarkKey(
                  skill.systemSkillName,
                  skill.directory,
                );

                return (
                  <motion.div layout key={skill.userSkillId} {...itemMotion}>
                    <ToggleCard
                      title={skill.systemSkillName}
                      subtitle={skill.directory}
                      checked={skill.useByDefault}
                      disabled={savingSkillDefaultId === skill.userSkillId}
                      visual={
                        serviceKey ? (
                          <ServiceMark
                            serviceKey={serviceKey}
                            className="size-11"
                            svgClassName="size-4.5"
                          />
                        ) : undefined
                      }
                      onCheckedChange={(next) => onToggleDefault(skill.userSkillId, next)}
                    />
                  </motion.div>
                );
              })
            : null}
        </AnimatePresence>
      </CardGrid>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
            System Market
          </h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Built-in and cataloged skills available for one-click install.
          </p>
        </div>

        <CardGrid>
          <AnimatePresence mode="popLayout">
            {loading ? (
              <LoadingCard key="skills-market-loading" label="Loading skill market" />
            ) : null}
            {!loading && marketSkills.length === 0 ? (
              <EmptyStateCard
                key="skills-market-empty"
                icon={Sparkles}
                title="No market skills"
                description="No system or catalog skills are currently available."
              />
            ) : null}
            {!loading
              ? marketSkills.map((skill) => (
                  <motion.div layout key={`${skill.systemSkillId}-${skill.directory}`} {...itemMotion}>
                    <MarketSkillCard skill={skill} onAdd={() => onAddMarketSkill(skill)} />
                  </motion.div>
                ))
              : null}
          </AnimatePresence>
        </CardGrid>
      </div>
    </div>
  );
}

export function ConnectorsSection({
  loading,
  connectors,
  marketConnectors,
  onAdd,
  onAddMarketConnector,
  onDisconnect,
  onToggleDefault,
  formState,
  setFormState,
  disconnectingConnectorId,
  savingConnectorDefaultId,
}: {
  loading: boolean;
  connectors: UserMcpItem[];
  marketConnectors: MarketConnectorItem[];
  onAdd: () => void;
  onAddMarketConnector: (connector: MarketConnectorItem) => void;
  onDisconnect: (userMcpServerId: string) => void;
  onToggleDefault: (userMcpServerId: string, next: boolean) => void;
  formState: ConnectorFormState;
  setFormState: (next: ConnectorFormState) => void;
  disconnectingConnectorId: string | null;
  savingConnectorDefaultId: string | null;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-8">
      <ComposerCard
        icon={Server}
        title="Connect New MCP"
        description="Attach remote MCP servers and let future chats boot with them ready."
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <PillInput
            placeholder="Connector Name"
            value={formState.name}
            onChange={(event) => setFormState({ ...formState, name: event.target.value })}
          />
          <PillInput
            placeholder="https://example.com/mcp"
            value={formState.endpoint}
            onChange={(event) => setFormState({ ...formState, endpoint: event.target.value })}
          />
          <button
            type="button"
            onClick={onAdd}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 font-semibold text-black transition-transform active:scale-95"
          >
            <Plus className="size-4" />
            Add
          </button>
        </div>
      </ComposerCard>

      <CardGrid>
        <AnimatePresence mode="popLayout">
          {loading ? <LoadingCard key="mcp-loading" label="Loading connectors" /> : null}
          {!loading && connectors.length === 0 ? (
            <EmptyStateCard
              key="mcp-empty"
              icon={Cable}
              title="No connectors yet"
              description="Register your first MCP server to expose external tools."
            />
          ) : null}
          {!loading
            ? connectors.map((connector) => (
                <motion.div layout key={connector.userMcpServerId} {...itemMotion}>
                  <ConnectorCard
                    connector={connector}
                    reconnectHref={
                      connector.connectorSlug
                        ? `/connectors/${connector.connectorSlug}?returnTo=${encodeURIComponent(pathname || "/customize")}`
                        : null
                    }
                    defaultDisabled={
                      savingConnectorDefaultId === connector.userMcpServerId ||
                      disconnectingConnectorId === connector.userMcpServerId ||
                      (connector.requiresAuth && connector.authStatus !== "connected")
                    }
                    disconnecting={
                      disconnectingConnectorId === connector.userMcpServerId
                    }
                    onDisconnect={() => onDisconnect(connector.userMcpServerId)}
                    onCheckedChange={(next) =>
                      onToggleDefault(connector.userMcpServerId, next)
                    }
                  />
                </motion.div>
              ))
            : null}
        </AnimatePresence>
      </CardGrid>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
            System Market
          </h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Cataloged connectors and MCP servers that can be added or configured from z0.
          </p>
        </div>

        <CardGrid>
          <AnimatePresence mode="popLayout">
            {loading ? (
              <LoadingCard key="mcp-market-loading" label="Loading connector market" />
            ) : null}
            {!loading && marketConnectors.length === 0 ? (
              <EmptyStateCard
                key="mcp-market-empty"
                icon={PlugZap}
                title="No market connectors"
                description="No system or catalog connectors are currently available."
              />
            ) : null}
            {!loading
              ? marketConnectors.map((connector) => {
                  const actionHref =
                    connector.slug && (connector.requiresAuth || connector.requiresSetup)
                      ? `/connectors/${connector.slug}?returnTo=${encodeURIComponent(pathname || "/customize")}`
                      : null;

                  return (
                    <motion.div layout key={`${connector.systemServerId}-${connector.endpoint}`} {...itemMotion}>
                      <MarketConnectorCard
                        connector={connector}
                        actionHref={actionHref}
                        onAdd={() => onAddMarketConnector(connector)}
                      />
                    </motion.div>
                  );
                })
              : null}
          </AnimatePresence>
        </CardGrid>
      </div>
    </div>
  );
}

export function PluginsSection({
  loading,
  plugins,
}: {
  loading: boolean;
  plugins: SystemPluginMarketItem[];
}) {
  return (
    <CardGrid>
      <AnimatePresence mode="popLayout">
        {loading ? <LoadingCard key="plugins-loading" label="Loading plugins" /> : null}
        {!loading && plugins.length === 0 ? (
          <EmptyStateCard
            key="plugins-empty"
            icon={PlugZap}
            title="No plugins yet"
            description="No plugin families are available in the capability inventory."
          />
        ) : null}
        {!loading
          ? plugins.map((plugin) => (
              <motion.div layout key={plugin.pluginId} {...itemMotion}>
                <GlassCard className="group h-full hover:bg-white/[0.03] dark:hover:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
                        {plugin.pluginId}
                      </p>
                      <h3 className="mt-2 truncate text-lg font-medium text-zinc-950 dark:text-white">
                        {plugin.name}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                      {plugin.status}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {plugin.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {summarizePluginCapabilities(plugin).map((capability) => (
                      <CapabilityPill key={`${plugin.pluginId}-${capability.label}`} label={capability.label} icon={capability.icon} />
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ))
          : null}
      </AnimatePresence>
    </CardGrid>
  );
}

export function SubagentsSection({
  loading,
  subagentRoles,
}: {
  loading: boolean;
  subagentRoles: SubagentRoleItem[];
}) {
  return (
    <CardGrid>
      <AnimatePresence mode="popLayout">
        {loading ? <LoadingCard key="subagents-loading" label="Loading subagents" /> : null}
        {!loading && subagentRoles.length === 0 ? (
          <EmptyStateCard
            key="subagents-empty"
            icon={Bot}
            title="No subagents yet"
            description="Specialist role routing has not been published into the plugin inventory."
          />
        ) : null}
        {!loading
          ? subagentRoles.map((role) => (
              <motion.div layout key={role.role} {...itemMotion}>
                <GlassCard className="h-full hover:bg-white/[0.03] dark:hover:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
                        {role.pluginId}
                      </p>
                      <h3 className="mt-2 truncate text-lg font-medium text-zinc-950 dark:text-white">
                        {role.role}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                      {role.status}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    Declared by {role.pluginName}. This role becomes routable once delegated execution and policy surfaces are mounted.
                  </p>
                </GlassCard>
              </motion.div>
            ))
          : null}
      </AnimatePresence>
    </CardGrid>
  );
}
