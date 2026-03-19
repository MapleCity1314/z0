"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ChevronDown, Sparkles, TrendingUp, Bug, AlertTriangle, Rocket } from "lucide-react";
import type { VersionRecord } from "@z0/backend/modules/versions";
import { cn } from "@/lib/utils";

export function VersionItem({
  version,
  defaultExpanded = false,
}: {
  version: VersionRecord;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isLatest = version.isLatest;

  return (
    <div className="group relative md:grid md:grid-cols-[160px_1fr] md:gap-12">
      <div className="hidden flex-col items-end pr-10 pt-6 text-right md:flex">
        <span className="text-sm font-mono font-bold uppercase tracking-tighter text-zinc-500 transition-colors group-hover:text-zinc-950 dark:group-hover:text-white">
          v{version.version}
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          {version.publishedAt ? format(version.publishedAt, "MMM d, yyyy") : "Pending"}
        </span>

        <div
          className={cn(
            "absolute right-[-6px] top-7 z-20 size-3 rounded-full border-2 transition-all duration-500",
            "border-white ring-4 ring-white/80 dark:border-black dark:ring-black",
            isLatest
              ? "bg-zinc-950 shadow-[0_0_20px_rgba(24,24,27,0.2)] dark:bg-white dark:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              : "bg-zinc-300 group-hover:bg-zinc-500 dark:bg-zinc-800 dark:group-hover:bg-zinc-500",
          )}
        />
      </div>

      <div className="relative">
        <div
          className={cn(
            "overflow-hidden rounded-[2.5rem] border transition-all duration-500",
            isExpanded
              ? "border-zinc-200/90 bg-white/78 shadow-2xl backdrop-blur-3xl dark:border-white/10 dark:bg-zinc-900/30"
              : "border-zinc-200/70 bg-white/55 hover:border-zinc-300 hover:bg-white/75 dark:border-white/5 dark:bg-zinc-900/10 dark:hover:border-white/10 dark:hover:bg-white/5",
          )}
        >
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-start gap-5 p-6 text-left outline-none md:p-8"
          >
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                {isLatest && (
                  <span className="flex items-center gap-1 rounded-full bg-zinc-950 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white dark:bg-white dark:text-black">
                    <Rocket className="size-3" /> Latest
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
                  {version.type} release
                </span>
              </div>
              <h3 className="text-xl font-medium text-zinc-950 transition-all group-hover:tracking-tight dark:text-white">
                {version.title}
              </h3>
            </div>

            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full border transition-all",
                "border-zinc-200 bg-white/80 text-zinc-500 dark:border-white/5 dark:bg-white/5 dark:text-zinc-500",
                isExpanded && "rotate-180 border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-black",
              )}
            >
              <ChevronDown className="size-5" />
            </div>
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="space-y-8 border-t border-zinc-200/80 px-8 pb-10 pt-2 dark:border-white/5">
                  <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2">
                    <LogSection title="Features" icon={Sparkles} items={version.features} color="text-blue-400" />
                    <LogSection title="Improvements" icon={TrendingUp} items={version.improvements} color="text-emerald-400" />
                    <LogSection title="Fixes" icon={Bug} items={version.bugFixes} color="text-purple-400" />
                    <LogSection title="Alerts" icon={AlertTriangle} items={version.breaking} color="text-red-400" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function LogSection({
  title,
  icon: Icon,
  items,
  color,
}: {
  title: string;
  icon: typeof Sparkles;
  items: Array<{ title: string; description?: string | null }> | undefined;
  color: string;
}) {
  if (!items?.length) return null;
  return (
    <div className="space-y-4">
      <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-70", color)}>
        <Icon className="size-3.5" /> {title}
      </div>
      <ul className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="group/item">
            <h5 className="text-sm font-medium text-zinc-900 transition-colors group-hover/item:text-zinc-950 dark:text-zinc-200 dark:group-hover/item:text-white">
              {item.title}
            </h5>
            {item.description ? (
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">{item.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
