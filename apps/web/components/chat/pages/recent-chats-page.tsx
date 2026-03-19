"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Search,
  MessageSquare,
  MoreVertical,
  Trash2,
  ExternalLink,
  Bot,
  Paperclip,
  X,
  MessageCircle,
} from "lucide-react";

import type { Chat, DBMessage } from "@/lib/schema";
import { deleteChat } from "@/lib/chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface RecentChatListProps {
  initialChats: Chat[];
  initialMessages: Record<string, DBMessage[]>;
}

export function RecentChatList({ initialChats, initialMessages }: RecentChatListProps) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter((chat) => {
      if (chat.title.toLowerCase().includes(query)) return true;
      const chatMessages = initialMessages[chat.id] || [];
      return chatMessages.some((msg) => {
        const parts = msg.parts as Array<{ type: string; text?: string }>;
        return parts.some(p => p.type === "text" && p.text?.toLowerCase().includes(query));
      });
    });
  }, [chats, initialMessages, searchQuery]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="relative group mx-auto w-full max-w-2xl">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-zinc-900 dark:group-focus-within:text-white" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full rounded-full border border-zinc-200/80 bg-white/80 py-3 pl-11 pr-11 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-300 focus:bg-white focus:ring-4 focus:ring-zinc-200/60 dark:border-white/5 dark:bg-white/5 dark:text-zinc-200 dark:focus:border-white/10 dark:focus:bg-white/10 dark:focus:ring-white/5"
        />
        <AnimatePresence>
          {searchQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              <X className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 scrollbar-hide">
        {filteredChats.length === 0 ? (
          <EmptyState isSearch={!!searchQuery} />
        ) : (
          <div className="mx-auto max-w-4xl space-y-3 pb-20">
            <AnimatePresence mode="popLayout">
              {filteredChats.map((chat, index) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  index={index}
                  messages={initialMessages[chat.id] || []}
                  onDelete={(id) => setChats(prev => prev.filter(c => c.id !== id))}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatRow({ chat, messages, index, onDelete }: { 
  chat: Chat; 
  messages: DBMessage[]; 
  index: number; 
  onDelete: (id: string) => void 
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const preview = useMemo(() => {
    const lastMsg = messages[messages.length - 1];
    const text = (lastMsg?.parts as any[])?.find(p => p.type === "text")?.text;
    return text || "View conversation details";
  }, [messages]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    const result = await deleteChat({ id: chat.id });
    if (result.success) {
      toast.success("Chat removed");
      onDelete(chat.id);
    } else {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      onClick={() => router.push(`/c/${chat.id}`)}
      className="group relative flex items-center gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/72 p-4 transition-all hover:border-zinc-300 hover:bg-white hover:backdrop-blur-xl dark:border-white/5 dark:bg-zinc-900/20 dark:hover:border-white/10 dark:hover:bg-white/5 md:p-5"
    >
      <div className="flex size-12 flex-none items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-500 transition-colors group-hover:text-zinc-900 dark:border-white/5 dark:bg-white/5 dark:text-zinc-400 dark:group-hover:text-white">
        <Bot className="size-6" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="truncate text-sm font-medium text-zinc-900 group-hover:text-zinc-950 dark:text-zinc-200 dark:group-hover:text-white">
            {chat.title || "Untitled Conversation"}
          </h3>
          <span className="flex-none text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
            {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: false })}
          </span>
        </div>
        <p className="line-clamp-1 text-xs leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-400">
          {preview}
        </p>
      </div>

      <div className="flex items-center gap-3 ml-2" onClick={(e) => e.stopPropagation()}>
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-600">
            <MessageCircle className="size-3" />
            {messages.length}
          </div>
          {messages.some(m => (m.attachments as any[])?.length > 0) && (
            <Paperclip className="size-3 text-zinc-500 dark:text-zinc-600" />
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-all outline-none hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-2xl border border-zinc-200/80 bg-white/95 text-zinc-700 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-300">
            <DropdownMenuItem onClick={() => router.push(`/c/${chat.id}`)} className="cursor-pointer rounded-xl py-2 focus:bg-zinc-100 focus:text-zinc-950 dark:focus:bg-white/10 dark:focus:text-white">
              <ExternalLink className="mr-2 size-4" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="cursor-pointer rounded-xl py-2 text-red-500 focus:bg-red-500/10 focus:text-red-500 dark:text-red-400 dark:focus:text-red-400">
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

function EmptyState({ isSearch }: { isSearch: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center pt-20 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-zinc-200 bg-white/70 backdrop-blur-md dark:border-white/5 dark:bg-white/5">
        <MessageSquare className="size-8 text-zinc-500 dark:text-zinc-600" />
      </div>
      <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-300">{isSearch ? "No matches" : "The void is quiet"}</h3>
      <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-zinc-500">
        {isSearch ? "Try different keywords." : "Start a new journey with the AI agent."}
      </p>
    </motion.div>
  );
}
