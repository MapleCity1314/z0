import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/metadata";
import { getRecentChats, getMessagesByChatId } from "@/components/chat/actions";
import { ChatPageShell } from "@/components/chat/page-shell";
import { RecentChatList } from "@/components/chat/recent-chat-list";
import type { DBMessage } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = pageMetadata.recent();

export default async function RecentChatPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/auth");

  const chatsResult = await getRecentChats();
  const chats = chatsResult.success ? chatsResult.data || [] : [];
  const messagesMap: Record<string, DBMessage[]> = {};

  await Promise.all(
    chats.map(async (chat) => {
      const messagesResult = await getMessagesByChatId({ id: chat.id });
      messagesMap[chat.id] = messagesResult.success && messagesResult.data ? messagesResult.data : [];
    }),
  );

  return (
    <ChatPageShell>
      <header className="mx-auto flex-none w-full max-w-5xl px-3 pb-8 text-center md:px-6 md:pb-10 md:text-left">
        <h1 className="text-4xl font-medium tracking-tight text-zinc-950 dark:text-white md:text-5xl">
          Recent <span className="text-zinc-500">Chats</span>
        </h1>
        <p className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
          Archives of intelligence
        </p>
      </header>

      <section className="min-h-0 flex-1">
        <RecentChatList initialChats={chats} initialMessages={messagesMap} />
      </section>

      <footer className="py-4 text-center text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-600 md:py-6">
        Encrypted & Synchronized
      </footer>
    </ChatPageShell>
  );
}
