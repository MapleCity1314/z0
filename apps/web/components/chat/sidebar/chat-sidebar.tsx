"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import {
  MessageSquare,
  Plus,
  LogIn,
  Trash2,
  History,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@z0/ui/button";
import { ScrollArea } from "@z0/ui/scroll-area";
import { ChatSidebarItem } from "./chat-sidebar-item";
import { ChatUserSection } from "./chat-user-section";
import { deleteChat, getRecentChats } from "@/lib/chat";
import { useUserStore } from "@/store/user";
import { toast } from "sonner";
import type { Chat } from "@/lib/schema";
import { Logo } from "@/components/logo";

interface SidebarProps {
  isOpen: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

export function ChatSidebar({
  isOpen,
  isMobile = false,
  onClose,
}: SidebarProps) {
  const isVisible = isOpen;

  const handleMobileOverlayClick = () => {
    if (isMobile && onClose) onClose();
  };

  const sidebarContent = (
    <div
      className={cn(
        "flex flex-col h-full transition-colors duration-300",
        // Removed border-r and border colors
        "bg-zinc-50 text-zinc-600", // Light
        "dark:bg-black dark:text-zinc-300", // Dark
      )}
    >
      {/* 1. Header */}
      <div className="h-14 flex items-center px-4 gap-2 shrink-0">
        <Logo size={24} className="text-zinc-900 dark:text-white" />
        <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto border bg-zinc-200 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
          Free
        </span>
      </div>

      {/* 2. 固定操作区 */}
      <div className="flex flex-col gap-2 px-3 pb-2 pt-0 shrink-0">
        <Button
          asChild
          className={cn(
            "w-full justify-start gap-2 border transition-all rounded-lg h-9 shadow-sm mb-2",
            "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900", // Light
            "dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white", // Dark
          )}
          variant="ghost"
        >
          <Link href="/" onClick={isMobile ? onClose : undefined}>
            <Plus className="size-4" />
            <span className="text-sm">New Chat</span>
          </Link>
        </Button>

        <div className="space-y-0.5">
          <div className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-muted-foreground/50">
            App
          </div>
          <ChatSidebarItem
            icon={SlidersHorizontal}
            label="Customize"
            href="/customize"
            onClick={isMobile ? onClose : undefined}
          />
          <ChatSidebarItem
            icon={History}
            label="All History"
            href="/recent"
            onClick={isMobile ? onClose : undefined}
          />
        </div>
      </div>

      {/* 3. 自适应滚动区：Recent Chats */}
      <div className="flex-1 min-h-0 flex flex-col px-3 relative group/recent mt-2">
        <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium uppercase tracking-wider shrink-0 text-zinc-400 dark:text-muted-foreground/50">
          <span>Recent Chats</span>
        </div>

        {/* 滚动容器 */}
        <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden">
          {/* 顶部细微遮罩 */}
          <div
            className={cn(
              "absolute top-0 left-0 right-0 h-2 z-10 pointer-events-none bg-gradient-to-b",
              "from-zinc-50 to-transparent", // Light
              "dark:from-black dark:to-transparent", // Dark
            )}
          />

          <ScrollArea className="h-full w-full">
            <RecentChatsList isMobile={isMobile} onClose={onClose} />
          </ScrollArea>

          {/* 底部较强的渐变遮罩 */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-10 bg-gradient-to-t",
              "from-zinc-50 via-zinc-50/80 to-transparent", // Light
              "dark:from-black dark:via-black/80 dark:to-transparent", // Dark
            )}
          />
        </div>
      </div>

      {/* 4. Footer */}
      <div className="p-3 mt-auto shrink-0 z-20 bg-zinc-50 dark:bg-black">
        <ChatUserSection />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={handleMobileOverlayClick}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-[280px] z-50 md:hidden shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isOpen ? 260 : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        // Removed border classes from wrapper
        "hidden md:block h-full overflow-hidden relative z-10 shrink-0",
        !isOpen && "invisible w-0",
      )}
    >
      {sidebarContent}
    </motion.aside>
  );
}

// --- Sub-Component: Recent Chats List ---

const RecentChatsList = ({
  isMobile,
  onClose,
}: {
  isMobile?: boolean;
  onClose?: () => void;
}) => {
  const user = useUserStore((state) => state?.user ?? null);
  const pathname = usePathname();
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const { data: chatsResult } = useSWR(
    user ? "recent-chats" : null,
    () => getRecentChats(),
    { revalidateOnFocus: false },
  );

  const recentChats: Chat[] = chatsResult?.success
    ? (chatsResult.data ?? [])
    : [];

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await deleteChat({ id: chatId });
    if (result.success) {
      toast.success("Chat deleted");
      mutate("recent-chats");
      if (pathname === `/c/${chatId}`) router.push("/");
    } else {
      toast.error(result.message);
    }
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) onClose();
  };

  if (!user) {
    return (
      <div className="px-3 py-6 text-center space-y-3">
        <p className="text-xs text-muted-foreground">Sign in to sync history</p>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
        >
          <Link href="/auth" onClick={handleLinkClick}>
            <LogIn className="size-3 mr-2" />
            Sign In
          </Link>
        </Button>
      </div>
    );
  }

  if (recentChats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-24 text-muted-foreground/40">
        <MessageSquare className="size-6 mb-2 opacity-50" />
        <span className="text-[10px]">No history yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 pb-20 pr-3 pl-1 pt-1">
      {recentChats.map((chat) => {
        const isActive = pathname === `/c/${chat.id}`;

        return (
          <Link
            key={chat.id}
            href={`/c/${chat.id}`}
            onClick={handleLinkClick}
            className={cn(
              "group relative flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200",
              // Hover States
              "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50",
              // Active States
              isActive
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            {/* Active Indicator Strip */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-0.5 bg-blue-500 rounded-r-full" />
            )}

            <MessageSquare
              className={cn(
                "size-3.5 shrink-0 transition-colors",
                isActive
                  ? "text-blue-500 dark:text-blue-400"
                  : "text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400",
              )}
            />

            <div className="flex-1 min-w-0 relative">
              <span
                className="block text-sm font-normal truncate"
                style={{
                  maskImage:
                    "linear-gradient(to right, black 70%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to right, black 70%, transparent 100%)",
                }}
              >
                {chat.title}
              </span>
            </div>

            {/* Delete Action */}
            <button
              type="button"
              onClick={(e) => handleDeleteChat(e, chat.id)}
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all opacity-0 translate-x-2 z-10",
                "bg-white border border-zinc-200 shadow-sm text-zinc-400 hover:text-red-500", // Light
                "dark:bg-zinc-900 dark:border-none dark:text-zinc-500 dark:hover:text-red-400", // Dark
                "group-hover:opacity-100 group-hover:translate-x-0",
              )}
            >
              <Trash2 className="size-3.5" />
            </button>
          </Link>
        );
      })}
    </div>
  );
};
