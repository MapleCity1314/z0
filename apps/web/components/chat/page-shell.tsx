"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChatPageShell({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn("flex min-h-full w-full flex-col text-zinc-900 dark:text-zinc-100", className)}>
      <div
        className={cn(
          "relative z-10 flex min-h-full flex-1 flex-col px-3 pb-4 pt-16 md:px-6 md:pb-6 md:pt-20",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
