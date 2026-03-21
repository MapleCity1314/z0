"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Blocks,
  Bot,
  Cable,
  CheckCircle2,
  Loader2,
  OctagonAlert,
  Plus,
  ShieldAlert,
  Sparkles,
  Unplug,
  Wrench,
} from "lucide-react";
import { GlassCard } from "@/components/customize/shared";
import {
  resolveServiceMarkKey,
  ServiceMark,
} from "@/components/integrations/service-mark";
import type {
  SystemMcpMarketItem,
  SystemPluginMarketItem,
  SystemSkillMarketItem,
} from "@/lib/chat";
import { Switch } from "@z0/ui/switch";
import type { UserMcpItem } from "./types";

export const itemMotion = {
  initial: { opacity: 0, scale: 0.94, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.94, y: -8 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

export function ComposerCard({
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

export function ToggleCard({
  title,
  subtitle,
  checked,
  disabled,
  visual,
  onCheckedChange,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  disabled?: boolean;
  visual?: ReactNode;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <GlassCard className="group relative flex items-center justify-between hover:bg-white/[0.03] dark:hover:bg-white/[0.03]">
      <div className="flex min-w-0 items-center gap-3">
        {visual ? <div className="shrink-0">{visual}</div> : null}
        <div className="min-w-0">
          <h4 className="truncate font-medium text-zinc-950 dark:text-zinc-200">{title}</h4>
          <p className="mt-1 truncate text-[10px] uppercase tracking-tighter text-zinc-500 dark:text-zinc-500">
            {subtitle}
          </p>
        </div>
      </div>
      <label className="flex flex-none items-center gap-3 rounded-full bg-white/70 px-4 py-2 text-[10px] font-bold uppercase text-zinc-500 transition-colors group-hover:bg-white group-hover:text-zinc-900 dark:bg-white/5 dark:text-zinc-400 dark:group-hover:bg-white/10 dark:group-hover:text-zinc-200">
        <span>Default</span>
        <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
      </label>
    </GlassCard>
  );
}

function ConnectorStatusPill({
  label,
  tone,
  icon: Icon,
}: {
  label: string;
  tone: "neutral" | "success" | "warning";
  icon: LucideIcon;
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
      : tone === "warning"
        ? "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
        : "border-zinc-200/70 bg-white/70 text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClassName}`}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

function getConnectorStatusMeta(connector: UserMcpItem) {
  if (!connector.requiresAuth) {
    return {
      label: "Direct",
      tone: "neutral" as const,
      icon: Cable,
    };
  }

  if (connector.authStatus === "connected") {
    return {
      label: "Connected",
      tone: "success" as const,
      icon: CheckCircle2,
    };
  }

  if (connector.authStatus === "expired") {
    return {
      label: "Expired",
      tone: "warning" as const,
      icon: OctagonAlert,
    };
  }

  return {
    label: "Needs Auth",
    tone: "warning" as const,
    icon: ShieldAlert,
  };
}

export function ConnectorCard({
  connector,
  reconnectHref,
  defaultDisabled,
  disconnecting,
  onCheckedChange,
  onDisconnect,
}: {
  connector: UserMcpItem;
  reconnectHref: string | null;
  defaultDisabled?: boolean;
  disconnecting?: boolean;
  onCheckedChange: (next: boolean) => void;
  onDisconnect: () => void;
}) {
  const status = getConnectorStatusMeta(connector);
  const serviceKey = resolveServiceMarkKey(
    connector.connectorSlug,
    connector.systemServerName,
    connector.authProvider,
  );
  const canReconnect =
    connector.requiresAuth &&
    !!connector.connectorSlug &&
    connector.authStatus !== "connected" &&
    reconnectHref !== null;
  const canDisconnect =
    connector.requiresAuth && connector.authStatus === "connected";

  return (
    <GlassCard className="group h-full hover:bg-white/[0.03] dark:hover:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {serviceKey ? (
            <ServiceMark serviceKey={serviceKey} className="size-12 shrink-0" svgClassName="size-5" />
          ) : null}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
              {connector.sourceType}
              {connector.authProvider ? ` / ${connector.authProvider}` : ""}
            </p>
            <h4 className="mt-2 truncate text-lg font-medium text-zinc-950 dark:text-zinc-200">
              {connector.systemServerName}
            </h4>
          </div>
        </div>
        <ConnectorStatusPill
          label={status.label}
          tone={status.tone}
          icon={status.icon}
        />
      </div>

      <p className="mt-3 truncate text-[11px] uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-500">
        {connector.endpoint}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {connector.privacyLevel ? (
          <ConnectorStatusPill
            label={`${connector.privacyLevel} privacy`}
            tone={connector.privacyLevel === "high" ? "warning" : "neutral"}
            icon={connector.privacyLevel === "high" ? ShieldAlert : Cable}
          />
        ) : null}
        {connector.connectedAt ? (
          <ConnectorStatusPill
            label={`Linked ${new Date(connector.connectedAt).toLocaleDateString()}`}
            tone="neutral"
            icon={CheckCircle2}
          />
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {canReconnect ? (
            <Link
              href={reconnectHref}
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-100 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {connector.authStatus === "expired" ? "Reconnect" : "Connect"}
            </Link>
          ) : null}
          {canDisconnect ? (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200/80 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/10"
            >
              {disconnecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Unplug className="size-4" />
              )}
              Disconnect
            </button>
          ) : null}
        </div>

        <label className="flex flex-none items-center gap-3 rounded-full bg-white/70 px-4 py-2 text-[10px] font-bold uppercase text-zinc-500 transition-colors group-hover:bg-white group-hover:text-zinc-900 dark:bg-white/5 dark:text-zinc-400 dark:group-hover:bg-white/10 dark:group-hover:text-zinc-200">
          <span>Default</span>
          <Switch
            checked={connector.useByDefault}
            disabled={defaultDisabled}
            onCheckedChange={onCheckedChange}
          />
        </label>
      </div>
    </GlassCard>
  );
}

export function LoadingCard({ label }: { label: string }) {
  return (
    <motion.div layout {...itemMotion}>
      <GlassCard className="flex items-center gap-3">
        <Loader2 className="size-5 animate-spin text-zinc-500 dark:text-zinc-400" />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      </GlassCard>
    </motion.div>
  );
}

export function EmptyStateCard({
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
        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </GlassCard>
    </motion.div>
  );
}

export function CapabilityPill({
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

export function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

export function MarketSkillCard({
  skill,
  disabled,
  onAdd,
}: {
  skill: SystemSkillMarketItem;
  disabled?: boolean;
  onAdd: () => void;
}) {
  const serviceKey = resolveServiceMarkKey(skill.name, skill.directory);

  return (
    <GlassCard className="group h-full hover:bg-white/[0.03] dark:hover:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {serviceKey ? (
            <ServiceMark serviceKey={serviceKey} className="size-12 shrink-0" svgClassName="size-5" />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400 dark:text-zinc-500">
              <Sparkles className="size-5" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
              {skill.sourceType}
            </p>
            <h4 className="mt-2 truncate text-lg font-medium text-zinc-950 dark:text-zinc-200">
              {skill.name}
            </h4>
          </div>
        </div>
      </div>

      <p className="mt-3 truncate text-[11px] uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-500">
        {skill.directory}
      </p>

      <div className="mt-6">
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          <Plus className="size-4" />
          Add Skill
        </button>
      </div>
    </GlassCard>
  );
}

export function MarketConnectorCard({
  connector,
  actionHref,
  disabled,
  onAdd,
}: {
  connector: SystemMcpMarketItem;
  actionHref: string | null;
  disabled?: boolean;
  onAdd: () => void;
}) {
  const serviceKey = resolveServiceMarkKey(
    connector.icon,
    connector.slug,
    connector.name,
    connector.provider,
  );

  return (
    <GlassCard className="group h-full hover:bg-white/[0.03] dark:hover:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {serviceKey ? (
            <ServiceMark serviceKey={serviceKey} className="size-12 shrink-0" svgClassName="size-5" />
          ) : null}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
              {connector.category} / {connector.provider}
            </p>
            <h4 className="mt-2 truncate text-lg font-medium text-zinc-950 dark:text-zinc-200">
              {connector.name}
            </h4>
          </div>
        </div>
        <ConnectorStatusPill
          label={connector.requiresAuth ? "Auth" : "Direct"}
          tone={connector.requiresAuth ? "warning" : "neutral"}
          icon={connector.requiresAuth ? ShieldAlert : Cable}
        />
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {connector.shortDescription}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {connector.tags.slice(0, 3).map((tag) => (
          <CapabilityPill key={`${connector.systemServerId}-${tag}`} label={tag} icon={Cable} />
        ))}
      </div>

      <div className="mt-6">
        {actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-100 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {connector.requiresAuth || connector.requiresSetup ? "Open Setup" : "Open"}
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            <Plus className="size-4" />
            Add Connector
          </button>
        )}
      </div>
    </GlassCard>
  );
}

export function summarizePluginCapabilities(plugin: SystemPluginMarketItem) {
  return [
    ...plugin.skills.map((label) => ({ label, icon: Sparkles })),
    ...plugin.mcpServers.map((label) => ({ label, icon: Cable })),
    ...plugin.tools.map((label) => ({ label, icon: Wrench })),
    ...plugin.subagentRoles.map((label) => ({ label, icon: Bot })),
    ...plugin.workflows.map((label) => ({ label, icon: Blocks })),
  ].slice(0, 4);
}
