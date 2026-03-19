"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const GlassContainer = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn(
    "rounded-[2.5rem] border border-white/5 bg-zinc-900/20 p-8 shadow-2xl backdrop-blur-3xl",
    className
  )}>
    {children}
  </div>
);

export const FormLabel = ({ children }: { children: ReactNode }) => (
  <label className="ml-4 mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
    {children}
  </label>
);

export const PillSelectTrigger = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn(
    "flex h-12 w-full items-center justify-between rounded-full border border-white/5 bg-white/5 px-6 text-sm text-zinc-300 transition-all hover:bg-white/10",
    className
  )}>
    {children}
  </div>
);