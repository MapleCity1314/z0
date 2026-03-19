"use client";

import { nanoid } from "nanoid";
import { useRef } from "react";
import Chat from "@/components/chat/chat";

export function ChatPage() {
  // Keep the draft chat id stable for the whole lifetime of the welcome page.
  // Replacing it during user-store hydration can break the first send flow.
  const chatIdRef = useRef<string>(nanoid());

  return (
    <Chat
      key={chatIdRef.current}
      autoResume={false}
      id={chatIdRef.current}
      initialMessages={[]}
      isNewChat
    />
  );
}
