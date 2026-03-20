"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { NAV_ITEMS } from "@/components/customize/nav";
import { GlassCard, StatTile } from "@/components/customize/shared";
import type { CustomizeSection } from "@/components/customize/types";
import { cn } from "@/lib/utils";

export function CustomizeSidebar({
  activeTab,
  onTabChange,
  stats,
}: {
  activeTab: CustomizeSection;
  onTabChange: (tab: CustomizeSection) => void;
  stats: {
    skills: number;
    connectors: number;
    plugins: number;
    subagents: number;
  };
}) {
  return (
    <GlassCard className="flex h-full flex-col gap-6 p-5 lg:w-80 lg:p-6">
      <header className="px-1">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
          Customize
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-zinc-950 dark:text-white">
          Context surfaces
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
          Shape your AI&apos;s context surfaces.
        </p>
      </header>

      <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={cn(
                "relative flex min-w-[180px] items-center gap-4 overflow-hidden rounded-3xl border p-4 text-left transition-colors lg:min-w-0",
                isActive
                  ? "border-white/20 text-black dark:border-white/20 dark:text-black"
                  : "border-zinc-200/70 bg-white/35 text-zinc-500 hover:bg-white/60 hover:text-zinc-950 dark:border-white/5 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:bg-white/7 dark:hover:text-white",
              )}
            >
              {isActive ? (
                <motion.div
                  layoutId="customize-active-tab"
                  className="absolute inset-0 bg-white shadow-[0_0_30px_rgba(255,255,255,0.12)]"
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
                />
              ) : null}

              <div className="relative z-10 flex size-10 items-center justify-center rounded-2xl bg-black/5 dark:bg-black/10">
                <Icon className={cn("size-5", isActive ? "text-black" : "text-zinc-500 dark:text-zinc-500")} />
              </div>
              <div className="relative z-10 min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-[10px] opacity-70">{item.description}</p>
              </div>
              <ChevronRight className="relative z-10 size-4 shrink-0 opacity-40" />
            </button>
          );
        })}
      </nav>

      <div className="mt-auto hidden grid-cols-2 gap-3 lg:grid">
        <StatTile label="Skills" value={stats.skills} />
        <StatTile label="MCP" value={stats.connectors} />
        <StatTile label="Plugins" value={stats.plugins} />
        <StatTile label="Roles" value={stats.subagents} />
      </div>
    </GlassCard>
  );
}
