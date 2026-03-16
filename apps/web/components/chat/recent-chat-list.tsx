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
import { deleteChat } from "@/components/chat/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export function RecentChatList({
  initialChats,
  initialMessages,
}: RecentChatListProps) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Search Logic (unchanged)
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    
    return chats.filter((chat) => {
      if (chat.title.toLowerCase().includes(query)) return true;
      const chatMessages = initialMessages[chat.id] || [];
      return chatMessages.some((msg) => {
        const parts = msg.parts as Array<{ type: string; text?: string }>;
        return parts.some(
          (part) => part.type === "text" && part.text?.toLowerCase().includes(query)
        );
      });
    });
  }, [chats, initialMessages, searchQuery]);

  const handleDeleteChat = (deletedId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== deletedId));
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search Input Area */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="size-4 text-zinc-500 group-focus-within:text-zinc-800 dark:group-focus-within:text-zinc-300 transition-colors" />
        </div>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search topics..."
          className={cn(
            "pl-10 pr-10 h-11 backdrop-blur-sm",
            "bg-white/50 border-zinc-200 text-zinc-900 placeholder:text-zinc-500 focus-visible:ring-zinc-300", // Light
            "dark:bg-zinc-900/50 dark:border-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus-visible:ring-zinc-700" // Dark
          )}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Stats Line */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-zinc-500 dark:text-zinc-500">
          {searchQuery ? `Found ${filteredChats.length} results` : `Total ${chats.length} conversations`}
        </span>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2 scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent scrollbar-thin">
        {filteredChats.length === 0 ? (
          <EmptyState isSearch={!!searchQuery} />
        ) : (
          <div className="space-y-3 pb-8">
            <AnimatePresence mode="popLayout">
              {filteredChats.map((chat, index) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  index={index}
                  messages={initialMessages[chat.id] || []}
                  onDelete={handleDeleteChat}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-Components ---

function ChatRow({
  chat,
  messages,
  index,
  onDelete,
}: {
  chat: Chat;
  messages: DBMessage[];
  index: number;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to get preview (unchanged)
  const preview = useMemo(() => {
    if (!messages.length) return "No messages yet";
    const lastMsg = messages[messages.length - 1];
    const parts = lastMsg.parts as Array<{ type: string; text?: string }>;
    const text = parts.find((p) => p.type === "text")?.text;
    return text ? (text.length > 120 ? text.slice(0, 120) + "..." : text) : "Attachment sent";
  }, [messages]);

  const hasAttachments = useMemo(() => {
    return messages.some(m => (m.attachments as any[])?.length > 0);
  }, [messages]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    const result = await deleteChat({ id: chat.id });
    if (result.success) {
      toast.success("Conversation deleted");
      onDelete(chat.id);
    } else {
      toast.error(result.message);
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.03 }}
      onClick={() => router.push(`/c/${chat.id}`)}
      className={cn(
        "group relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer overflow-hidden backdrop-blur-sm",
        // Light styles
        "border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-sm",
        // Dark styles
        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 dark:hover:border-zinc-700"
      )}
    >
      {/* Selection/Hover Highlight Stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-500/50 transition-colors" />

      {/* Icon */}
      <div className="flex-none mt-1">
        <div className={cn(
          "flex size-10 items-center justify-center rounded-lg border transition-colors",
          "border-zinc-100 bg-zinc-50 text-zinc-500 group-hover:border-zinc-200 group-hover:text-blue-600", // Light
          "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500 dark:group-hover:text-blue-400 dark:group-hover:border-zinc-700" // Dark
        )}>
          <Bot className="size-5" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white truncate transition-colors">
            {chat.title}
          </h3>
          <span className="flex-none text-xs text-zinc-400 dark:text-zinc-500 font-mono">
            {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
          </span>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed h-[42px]">
          {preview}
        </p>

        <div className="flex items-center justify-between pt-2">
           <div className="flex items-center gap-2">
             <Badge variant="secondary" className="bg-zinc-100 border-zinc-200 text-zinc-500 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-500 text-[10px] h-5 px-1.5 pointer-events-none">
                <MessageCircle className="size-3 mr-1" />
                {messages.length}
             </Badge>
             {hasAttachments && (
               <Badge variant="secondary" className="bg-zinc-100 border-zinc-200 text-zinc-500 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-500 text-[10px] h-5 px-1.5 pointer-events-none">
                  <Paperclip className="size-3 mr-1" />
                  Files
               </Badge>
             )}
           </div>

           {/* Hover Actions */}
           <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
             <Button 
                variant="ghost" 
                size="icon" 
                className="size-7 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:text-white dark:hover:bg-zinc-800"
                onClick={() => router.push(`/c/${chat.id}`)}
              >
                <ExternalLink className="size-3.5" />
             </Button>
             
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="icon" className="size-7 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:text-white dark:hover:bg-zinc-800">
                   <MoreVertical className="size-3.5" />
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  <DropdownMenuItem 
                    className="text-red-500 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10 cursor-pointer"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete Chat
                  </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ isSearch }: { isSearch: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-[60%] text-center px-4"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800 mb-6">
        <MessageSquare className="size-8 text-zinc-400 dark:text-zinc-600" />
      </div>
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-200 mb-2">
        {isSearch ? "No matching chats found" : "No conversation history"}
      </h3>
      <p className="text-sm text-zinc-500 max-w-sm">
        {isSearch 
          ? "Try adjusting your search terms or keywords." 
          : "Your recent conversations with the AI will appear here."}
      </p>
    </motion.div>
  );
}