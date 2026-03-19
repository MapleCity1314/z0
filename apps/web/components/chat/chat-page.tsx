"use client";

import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import Chat from "@/components/chat/chat";
import { useUserStore } from "@/store/user";

export function ChatPage() {
  const userId = useUserStore((state) => state.user?.id ?? null);
  const [chatId, setChatId] = useState(() => nanoid());

  useEffect(() => {
    setChatId(nanoid());
  }, [userId]);

  return (
    <Chat
      key={chatId}
      autoResume={false}
      id={chatId}
      initialMessages={[]}
      isNewChat
    />
  );
}
