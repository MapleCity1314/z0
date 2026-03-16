// app/(app)/chat/recent/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { pageMetadata } from "@/lib/metadata";
import { getRecentChats, getMessagesByChatId } from "@/components/chat/actions";
import { RecentChatList } from "@/components/chat/recent-chat-list";
import { authOptions } from "@/lib/auth";
import type { DBMessage } from "@/lib/schema";

export const metadata: Metadata = pageMetadata.recent();

export default async function RecentChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth");
  }

  // 1. Get all chats
  const chatsResult = await getRecentChats();
  const chats = chatsResult.success ? chatsResult.data || [] : [];

  // 2. Get messages for search (Consider limiting this depth in production for performance)
  const messagesMap: Record<string, DBMessage[]> = {};
  
  await Promise.all(
    chats.map(async (chat) => {
      const messagesResult = await getMessagesByChatId({ id: chat.id });
      if (messagesResult.success && messagesResult.data) {
        messagesMap[chat.id] = messagesResult.data;
      } else {
        messagesMap[chat.id] = [];
      }
    })
  );

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* Background Decorator */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute right-0 top-0 -z-10 h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-10 blur-[100px]" />
        <div className="absolute left-0 bottom-0 -z-10 h-[310px] w-[310px] rounded-full bg-blue-500 opacity-10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex h-full flex-col max-w-5xl mx-auto">
        {/* Fixed Header Section */}
        <div className="flex-none px-4 py-8 pb-4">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Recent Chats</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Search and manage your conversation history
          </p>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 min-h-0 px-4 pb-4">
          <RecentChatList initialChats={chats} initialMessages={messagesMap} />
        </div>
      </div>
    </div>
  );
}