"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border p-6 backdrop-blur-3xl shadow-[0_28px_90px_-52px_rgba(0,0,0,0.55)]",
        "border-zinc-200/70 bg-white/72",
        "dark:border-white/5 dark:bg-zinc-900/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PillInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-full border px-6 py-3 text-sm transition-all focus:outline-none focus:ring-2",
        "border-zinc-200/80 bg-white/80 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:ring-zinc-200/70",
        "dark:border-white/5 dark:bg-white/5 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:bg-white/10 dark:focus:ring-white/10",
        props.className,
      )}
    />
  );
}

export function StatTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 text-center dark:border-white/5 dark:bg-white/5">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-medium text-zinc-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}
