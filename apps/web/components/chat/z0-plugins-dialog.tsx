"use client";

import {
  BadgePlus,
  Blocks,
  CheckCircle2,
  FlaskConical,
  GitBranch,
  Layers3,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SystemPluginMarketItem } from "./integration-market-types";

type Z0PluginsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plugins: SystemPluginMarketItem[];
};

function summarizeCapabilities(plugin: SystemPluginMarketItem) {
  const capabilities = [
    ...plugin.tools.map((tool) => ({ label: tool, kind: "tool" as const })),
    ...plugin.skills.map((skill) => ({ label: skill, kind: "skill" as const })),
    ...plugin.mcpServers.map((server) => ({
      label: server,
      kind: "mcp" as const,
    })),
    ...plugin.uiPanels.map((panel) => ({
      label: panel,
      kind: "panel" as const,
    })),
    ...plugin.workflows.map((workflow) => ({
      label: workflow,
      kind: "workflow" as const,
    })),
    ...plugin.subagentRoles.map((role) => ({
      label: role,
      kind: "subagent" as const,
    })),
  ];

  return capabilities.slice(0, 4);
}

function getPluginStatusLabel(plugin: SystemPluginMarketItem) {
  if (plugin.runtimeStatus === "not-mounted") {
    return "Planned, not mounted";
  }

  if (plugin.status === "active") {
    return "Active";
  }

  return "Planned";
}

function getPluginStatusTone(plugin: SystemPluginMarketItem) {
  if (plugin.runtimeStatus === "mounted" && plugin.status === "active") {
    return "bg-emerald-500/15 text-emerald-200";
  }

  return "bg-amber-500/15 text-amber-200";
}

function getPluginFootnote(plugin: SystemPluginMarketItem) {
  if (plugin.runtimeStatus === "not-mounted") {
    return "Current state: cataloged for boundary planning only. Install and runtime mounting flows are not available yet.";
  }

  if (plugin.dependencies.length > 0) {
    return `Depends on ${plugin.dependencies.join(", ")}`;
  }

  return "Mounted through z0 core.";
}

function CapabilityBadge({
  label,
  kind,
}: {
  label: string;
  kind: "tool" | "skill" | "mcp" | "panel" | "workflow" | "subagent";
}) {
  const Icon =
    kind === "tool"
      ? Wrench
      : kind === "skill"
        ? Sparkles
        : kind === "mcp"
          ? Blocks
          : kind === "panel"
            ? Layers3
            : kind === "workflow"
              ? GitBranch
              : BadgePlus;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">
      <Icon className="h-3.5 w-3.5 text-zinc-400" />
      {label}
    </span>
  );
}

export function Z0PluginsDialog({
  open,
  onOpenChange,
  plugins,
}: Z0PluginsDialogProps) {
  const plannedCount = plugins.filter((plugin) => plugin.status === "planned").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-0 shadow-2xl sm:h-[82vh] sm:!max-w-5xl">
        <DialogHeader className="shrink-0 border-zinc-800 border-b bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_30%),#09090b] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <BadgePlus className="h-6 w-6 text-amber-300" />
            z0 Plugins
          </DialogTitle>
          <div className="mt-3 flex flex-col gap-3 text-sm text-zinc-300 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="font-medium text-amber-200">Planning contract surface</p>
              <p className="mt-1 text-zinc-400">
                Plugins are the planned capability layer above z0 core. This panel
                tracks intended plugin families and ownership boundaries, while the
                current runtime still executes through core-owned chat, tool,
                skill, and MCP seams.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              <FlaskConical className="h-4 w-4 text-amber-300" />
              {plannedCount} planned plugin families
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {plugins.map((plugin) => {
              const capabilities = summarizeCapabilities(plugin);

              return (
                <section
                  key={plugin.pluginId}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                        {plugin.pluginId}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-white">
                        {plugin.name}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                        getPluginStatusTone(plugin),
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {getPluginStatusLabel(plugin)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {plugin.description}
                  </p>

                  {capabilities.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {capabilities.map((capability) => (
                        <CapabilityBadge
                          key={`${plugin.pluginId}-${capability.kind}-${capability.label}`}
                          label={capability.label}
                          kind={capability.kind}
                        />
                      ))}
                    </div>
                  ) : null}

                  <p className="mt-4 text-xs text-zinc-500">
                    {getPluginFootnote(plugin)}
                  </p>

                  {plugin.dependencies.length > 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Depends on {plugin.dependencies.join(", ")}
                    </p>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
