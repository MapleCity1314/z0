"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FolderKanban,
  MessageCircle,
  Tag,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Chats",
    href: "/admin/chats",
    icon: MessageSquare,
  },
  {
    title: "Projects",
    href: "/admin/projects",
    icon: FolderKanban,
  },
  {
    title: "Feedback",
    href: "/admin/feedback",
    icon: MessageCircle,
  },
  {
    title: "Versions",
    href: "/admin/versions",
    icon: Tag,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-full border-r border-border bg-card flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <Link href="/admin" className="font-semibold text-lg">
            Z0 Admin
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-md hover:bg-accent transition-colors",
            collapsed && "mx-auto"
          )}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-2 border-t border-border">
        <Link
          href="/admin/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/admin/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
