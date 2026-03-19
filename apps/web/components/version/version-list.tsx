"use client";

import { History } from "lucide-react";
import type { VersionRecord } from "@z0/backend/modules/versions";
import { VersionItem } from "./version-item";

export function VersionList({ versions }: { versions: VersionRecord[] }) {
  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[3rem] border border-zinc-200/80 bg-white/70 py-24 backdrop-blur-xl dark:border-white/5 dark:bg-white/5">
        <History className="mb-4 size-10 text-zinc-400 dark:text-zinc-700" />
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
          Genesis in progress
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute bottom-4 left-8 top-4 hidden w-px bg-gradient-to-b from-transparent via-zinc-300 to-transparent dark:via-white/10 md:block md:left-[160px]" />

      <div className="space-y-12">
        {versions.map((version, index) => (
          <VersionItem
            key={version.id}
            version={version}
            defaultExpanded={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
