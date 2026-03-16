"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/store/user";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export const UserSection = () => {
  const user = useUserStore((state) => state?.user ?? null);
  const router = useRouter();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <button
      type="button"
      onClick={() => router.push("/profile")}
      className={cn(
        "flex items-center gap-3 px-2 py-3 mt-auto w-full rounded-lg transition-colors",
        "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
      )}
    >
      <Avatar className="size-8 border border-zinc-200 dark:border-white/10">
        <AvatarImage src={user?.avatar || undefined} />
        <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
          {user?.name ? getInitials(user.name) : "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col overflow-hidden transition-all text-left">
        <span className="text-sm font-medium text-zinc-700 dark:text-foreground truncate">
          {user?.name || "Guest"}
        </span>
        <span className="text-xs text-zinc-500 dark:text-muted-foreground truncate">Free Plan</span>
      </div>
    </button>
  );
};