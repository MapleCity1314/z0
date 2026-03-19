"use client";

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
import { GlassCard, PillInput } from "@/components/customize/shared";
import type {
  ConnectorFormState,
  SkillFormState,
  SubagentRoleItem,
  UserMcpItem,
  UserSkillItem,
} from "@/components/customize/types";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const itemMotion = {
  initial: { opacity: 0, scale: 0.94, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.94, y: -8 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

export function SkillsSection({
  loading,
  skills,
  onAdd,
  onToggleDefault,
  formState,
  setFormState,
  savingSkillDefaultId,
}: {
  loading: boolean;
  skills: UserSkillItem[];
  onAdd: () => void;
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
            ? skills.map((skill) => (
                <motion.div layout key={skill.userSkillId} {...itemMotion}>
                  <ToggleCard
                    title={skill.systemSkillName}
                    subtitle={skill.directory}
                    checked={skill.useByDefault}
                    disabled={savingSkillDefaultId === skill.userSkillId}
                    onCheckedChange={(next) => onToggleDefault(skill.userSkillId, next)}
                  />
                </motion.div>
              ))
            : null}
        </AnimatePresence>
      </CardGrid>
    </div>
  );
}

export function ConnectorsSection({
  loading,
  connectors,
  onAdd,
  onToggleDefault,
  formState,
  setFormState,
  savingConnectorDefaultId,
}: {
  loading: boolean;
  connectors: UserMcpItem[];
  onAdd: () => void;
  onToggleDefault: (userMcpServerId: string, next: boolean) => void;
  formState: ConnectorFormState;
  setFormState: (next: ConnectorFormState) => void;
  savingConnectorDefaultId: string | null;
}) {
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
                  <ToggleCard
                    title={connector.systemServerName}
                    subtitle={connector.endpoint}
                    checked={connector.useByDefault}
                    disabled={savingConnectorDefaultId === connector.userMcpServerId}
                    onCheckedChange={(next) => onToggleDefault(connector.userMcpServerId, next)}
                  />
                </motion.div>
              ))
            : null}
        </AnimatePresence>
      </CardGrid>
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

function ComposerCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-black">
          <Icon className="size-6" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-zinc-950 dark:text-white">{title}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">{description}</p>
        </div>
      </div>
      {children}
    </GlassCard>
  );
}

function ToggleCard({
  title,
  subtitle,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <GlassCard className="group relative flex items-center justify-between hover:bg-white/[0.03] dark:hover:bg-white/[0.03]">
      <div className="min-w-0">
        <h4 className="truncate font-medium text-zinc-950 dark:text-zinc-200">{title}</h4>
        <p className="mt-1 truncate text-[10px] uppercase tracking-tighter text-zinc-500 dark:text-zinc-500">
          {subtitle}
        </p>
      </div>
      <label className="flex flex-none items-center gap-3 rounded-full bg-white/70 px-4 py-2 text-[10px] font-bold uppercase text-zinc-500 transition-colors group-hover:bg-white group-hover:text-zinc-900 dark:bg-white/5 dark:text-zinc-400 dark:group-hover:bg-white/10 dark:group-hover:text-zinc-200">
        <span>Default</span>
        <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
      </label>
    </GlassCard>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <motion.div layout {...itemMotion}>
      <GlassCard className="flex items-center gap-3">
        <Loader2 className="size-5 animate-spin text-zinc-500 dark:text-zinc-400" />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      </GlassCard>
    </motion.div>
  );
}

function EmptyStateCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <motion.div layout {...itemMotion}>
      <GlassCard className="flex min-h-[220px] flex-col items-center justify-center text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-white/80 text-black dark:bg-white dark:text-black">
          <Icon className="size-7" />
        </div>
        <h3 className="mt-5 text-lg font-medium text-zinc-950 dark:text-white">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
      </GlassCard>
    </motion.div>
  );
}

function CapabilityPill({
  label,
  icon: Icon,
}: {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/60 px-3 py-1.5 text-[11px] text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
      <Icon className="size-3.5 text-zinc-500 dark:text-zinc-400" />
      {label}
    </span>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function summarizePluginCapabilities(plugin: SystemPluginMarketItem) {
  return [
    ...plugin.skills.map((label) => ({ label, icon: Sparkles })),
    ...plugin.mcpServers.map((label) => ({ label, icon: Cable })),
    ...plugin.tools.map((label) => ({ label, icon: Wrench })),
    ...plugin.subagentRoles.map((label) => ({ label, icon: Bot })),
    ...plugin.workflows.map((label) => ({ label, icon: Blocks })),
  ].slice(0, 4);
}
