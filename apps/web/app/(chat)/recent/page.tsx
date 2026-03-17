import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/metadata";
import { getRecentChats, getMessagesByChatId } from "@/components/chat/actions";
import { RecentChatList } from "@/components/chat/recent-chat-list";
import type { DBMessage } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = pageMetadata.recent();

export default async function RecentChatPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/auth");
  }

  const chatsResult = await getRecentChats();
  const chats = chatsResult.success ? chatsResult.data || [] : [];

  const messagesMap: Record<string, DBMessage[]> = {};

  await Promise.all(
    chats.map(async (chat) => {
      const messagesResult = await getMessagesByChatId({ id: chat.id });
      messagesMap[chat.id] =
        messagesResult.success && messagesResult.data ? messagesResult.data : [];
    }),
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute right-0 top-0 -z-10 h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 -z-10 h-[310px] w-[310px] rounded-full bg-blue-500 opacity-10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col">
        <div className="flex-none px-4 py-8 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Recent Chats</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Search and manage your conversation history
          </p>
        </div>

        <div className="flex-1 min-h-0 px-4 pb-4">
          <RecentChatList initialChats={chats} initialMessages={messagesMap} />
        </div>
      </div>
    </div>
  );
}
