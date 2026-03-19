"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ThinkingVoidProps = {
  label?: string;
  className?: string;
};

export function ThinkingVoid({
  label = "Synthesizing",
  className,
}: ThinkingVoidProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 overflow-visible py-1 pl-2",
        className,
      )}
    >
      <motion.div
        animate={{
          scaleX: [1, 1.5, 1],
          opacity: [0.3, 1, 0.3],
          filter: ["blur(2px)", "blur(0px)", "blur(2px)"],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="h-3.5 w-3.5 rounded-full border-[2px] border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
      />
      <motion.span
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          delay: 0.2,
        }}
        className="truncate font-serif text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500"
      >
        {label}
      </motion.span>
    </div>
  );
}
