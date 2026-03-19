"use client";

import { motion } from "framer-motion";
import { PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatSidebarToggle({
  isOpen,
  onToggle,
}: SidebarToggleProps) {
  return (
    <div className="absolute top-3 left-3 z-50 flex items-center gap-2">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                "size-8 rounded-lg transition-colors",
                "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200", // Light
                "dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800" // Dark
              )}
            >
              <PanelLeftClose className={cn("size-5 transition-transform", !isOpen && "rotate-180")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {isOpen ? "Close sidebar" : "Open sidebar"} <span className="text-zinc-500 ml-1">⌘S</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {!isOpen && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm font-medium text-zinc-500 dark:text-zinc-400"
        >
          New Chat
        </motion.span>
      )}
    </div>
  );
}
