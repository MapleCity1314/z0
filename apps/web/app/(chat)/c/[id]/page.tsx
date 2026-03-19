import { ChatScreen } from "@/components/chat/pages";
import { getChatById, getMessagesByChatId } from "@/lib/chat";
import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { normalizeStoredMessageParts } from "@/lib/utils/message-parts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const chatResult = await getChatById({ id });

  if (!chatResult.success || !chatResult.data) {
    return pageMetadata.chat();
  }

  return pageMetadata.chat(chatResult.data.title || "New Chat");
}

export default async function ChatPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const chatResult = await getChatById({ id });

  if (!chatResult.success || !chatResult.data) {
    return notFound();
  }

  const messagesResult = await getMessagesByChatId({ id });
  
  const uiMessages: UIMessage[] = messagesResult.success && messagesResult.data
    ? messagesResult.data.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        parts: normalizeStoredMessageParts(msg.parts) as UIMessage["parts"],
      }))
    : [];

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-zinc-500">Loading...</div>}>
      <ChatScreen
        key={chatResult.data.id}
        autoResume={true}
        id={chatResult.data.id}
        initialMessages={uiMessages}
        projectId={chatResult.data.projectId || null}
      />
    </Suspense>
  );
}
