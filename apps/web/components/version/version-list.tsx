// components/version/version-list.tsx
import type { VersionRecord } from "@z0/backend";
import { VersionItem } from "./version-item";
import { History, GitCommit } from "lucide-react";

interface VersionListProps {
  versions: Array<
    Omit<VersionRecord, "createdAt" | "updatedAt" | "publishedAt"> & {
      createdAt: Date;
      updatedAt: Date;
      publishedAt: Date | null;
    }
  >;
}

export function VersionList({ versions }: VersionListProps) {
  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
        <div className="flex size-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 mb-4">
          <History className="size-6 text-zinc-500" />
        </div>
        <h3 className="text-lg font-medium text-zinc-200">
          No versions published yet
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          Stay tuned for future updates and improvements.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 pl-8 md:pl-0">
      {/* Timeline Line (Desktop Only - positioned absolutely in center or left) */}
      <div className="absolute left-8 top-4 bottom-4 w-px bg-zinc-800 hidden md:block md:left-[160px]" />

      {versions.map((version, index) => (
        <VersionItem
          key={version.id}
          version={version}
          defaultExpanded={index === 0}
          isLast={index === versions.length - 1}
        />
      ))}

      {/* End Node */}
      <div className="hidden md:flex items-center gap-6 mt-8">
        <div className="w-[160px] text-right text-xs text-zinc-600 font-mono pr-8">
          Initial Commit
        </div>
        <div className="relative z-10 flex size-3 items-center justify-center rounded-full bg-zinc-800 ring-4 ring-black">
          <div className="size-1 rounded-full bg-zinc-600" />
        </div>
      </div>
    </div>
  );
}
