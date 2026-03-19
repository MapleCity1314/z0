"use client";

import { Zap, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ChatHeaderActions() {
  return (
    <div className="absolute top-3 right-4 z-50 flex items-center gap-2">
      {/* Desktop: Full actions */}
      <div className="hidden md:flex items-center gap-2">
        <ThemeToggle />
        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 rounded-full transition-colors",
            "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200", // Light
            "dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800" // Dark
          )}
          asChild
        >
          <Link href="/versions">What's New</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 rounded-full transition-colors",
            "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200", // Light
            "dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800" // Dark
          )}
          asChild
        >
          <Link href="/feedback">Feedback</Link>
        </Button>
        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
      </div>

      {/* Mobile: Dropdown menu */}
      <div className="flex md:hidden items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild suppressHydrationWarning>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-8 rounded-lg transition-colors",
                "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200", // Light
                "dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800" // Dark
              )}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <Link href="/versions" className="cursor-pointer">
                What's New
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/feedback" className="cursor-pointer">
                Feedback
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Credits badge - always visible */}
      <div className={cn(
        "flex items-center gap-1 rounded-full px-2 py-1 border",
        "bg-zinc-100 border-zinc-200", // Light
        "dark:bg-zinc-900 dark:border-zinc-800" // Dark
      )}>
        <Zap className="size-3 text-yellow-500 fill-yellow-500" />
        <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">3.48</span>
      </div>
    </div>
  );
}
