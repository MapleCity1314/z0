"use client";

import { nanoid } from "nanoid";
import { useRef } from "react";
import Chat from "@/components/chat/chat";

export function ChatPage() {
  const chatIdRef = useRef<string | null>(null);

  if (!chatIdRef.current) {
    chatIdRef.current = nanoid();
  }

  return (
    <Chat
      autoResume={false}
      id={chatIdRef.current}
      initialMessages={[]}
      isNewChat
    />
  );
}
