"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Circle, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassContainer } from "./shared";

const STATUS_MAP = {
  pending: { icon: Circle, color: "text-zinc-500", label: "Queue" },
  reviewing: { icon: Clock, color: "text-blue-400", label: "Review" },
  planned: { icon: AlertCircle, color: "text-purple-400", label: "Planned" },
  completed: { icon: CheckCircle2, color: "text-emerald-400", label: "Live" },
  rejected: { icon: XCircle, color: "text-red-400", label: "Closed" },
};

export function FeedbackList({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-[2.5rem] border border-white/5 bg-white/5">
        <MessageSquare className="mb-4 size-8 text-zinc-700" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">No logs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {items.map((item, i) => {
          const config = STATUS_MAP[item.status as keyof typeof STATUS_MAP] || STATUS_MAP.pending;
          const Icon = config.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassContainer className="p-6 transition-all hover:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {item.type}
                      </span>
                      <span className="size-1 rounded-full bg-zinc-800" />
                      <span className="text-[10px] font-mono text-zinc-600">
                        {formatDistanceToNow(new Date(item.createdAt))} ago
                      </span>
                    </div>
                    <h3 className="truncate text-base font-medium text-white">{item.title}</h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">{item.content}</p>
                  </div>

                  <div className={cn("flex flex-none items-center gap-2 rounded-full border border-white/5 bg-black/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider", config.color)}>
                    <Icon className="size-3" />
                    {config.label}
                  </div>
                </div>

                {item.adminResponse && (
                  <div className="mt-6 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase text-blue-400/80">
                      <div className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Official Response
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-300">{item.adminResponse}</p>
                  </div>
                )}
              </GlassContainer>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}