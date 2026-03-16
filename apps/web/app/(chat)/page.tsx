import Chat from "@/components/chat/chat";
import { nanoid } from "nanoid";
import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata.home();

export default function Page() {
  const id = nanoid();

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-zinc-500">Loading...</div>}>
      <Chat 
        autoResume={false}
        id={id}
        initialMessages={[]}
        isNewChat={true}
        key={id}
      />
    </Suspense>
  );
}