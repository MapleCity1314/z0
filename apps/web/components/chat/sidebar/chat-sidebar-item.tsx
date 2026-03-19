"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
}

export function ChatSidebarItem({
  icon: Icon,
  label,
  href,
  onClick,
}: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = href ? pathname === href : false;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
  };

  const content = (
    <Button
      variant="ghost"
      onClick={handleClick}
      className={cn(
        "w-full justify-start gap-3 px-3 py-2 h-9 font-normal transition-all",
        // 默认状态 (亮色/暗色)
        "text-zinc-600 dark:text-muted-foreground",
        // Hover 状态
        "hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-white dark:hover:bg-white/5",
        // 激活状态
        isActive && "bg-zinc-200 text-zinc-900 font-medium dark:bg-white/10 dark:text-white"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Button>
  );

  if (href) {
    return (
      <Link href={href} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return content;
}
