"use client";

import { useTheme } from "next-themes";
import FluidBackground from "@/components/fluid-background";
import { cn } from "@/lib/utils";

type ThemedFluidBackgroundProps = {
  className?: string;
  overlayClassName?: string;
  topGlowClassName?: string;
};

export function ThemedFluidBackground({
  className,
  overlayClassName,
  topGlowClassName,
}: ThemedFluidBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-0 overflow-hidden", className)}>
      <FluidBackground isDark={isDark} />
      <div
        className={cn(
          "absolute inset-0 bg-white/68 backdrop-blur-[3px] dark:bg-black/35",
          overlayClassName,
        )}
      />
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/75 via-white/35 to-transparent dark:from-zinc-950/85 dark:via-zinc-950/45",
          topGlowClassName,
        )}
      />
    </div>
  );
}
