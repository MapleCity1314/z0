"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ThemedFluidBackground } from "@/components/themed-fluid-background";

export function ChatContentSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate h-full overflow-hidden rounded-xl",
        className,
      )}
    >
      <ThemedFluidBackground
        className="pointer-events-none rounded-xl"
        overlayClassName="bg-white/50 backdrop-blur-[2px] dark:bg-black/30"
        topGlowClassName="h-24 bg-gradient-to-b from-white/35 via-white/10 to-transparent dark:from-zinc-950/35 dark:via-zinc-950/10"
      />
      <div
        className={cn(
          "relative z-10 h-full overflow-auto rounded-[inherit]",
          "[&::-webkit-scrollbar]:w-1.5",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full",
          "[&::-webkit-scrollbar-thumb]:bg-zinc-300/60",
          "[&::-webkit-scrollbar-thumb]:hover:bg-zinc-400/80",
          "dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800/60",
          "dark:[&::-webkit-scrollbar-thumb]:hover:bg-zinc-700/80",
          "[&::-webkit-scrollbar-thumb]:transition-colors",
        )}
      >
        {children}
      </div>
    </div>
  );
}
