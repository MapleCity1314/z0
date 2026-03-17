import { Suspense } from "react";
import type { Metadata } from "next";
import { ChatPage } from "@/components/chat/chat-page";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata.home();

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-zinc-500">Loading...</div>}>
      <ChatPage />
    </Suspense>
  );
}
