"use client";

import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { useDataStream } from "@/components/provider/data-stream-provider";

export type UseAutoResumeParams = {
  autoResume: boolean;
  initialMessages: UIMessage[];
  resumeStream: UseChatHelpers<UIMessage>["resumeStream"];
  setMessages: UseChatHelpers<UIMessage>["setMessages"];
};

export function useAutoResume({
  autoResume,
  initialMessages,
  resumeStream,
  setMessages,
}: UseAutoResumeParams) {
  const { dataStream } = useDataStream();
  const hasResumedRef = useRef(false);

  useEffect(() => {
    // Skip if autoResume is disabled or already resumed
    if (!autoResume || hasResumedRef.current) {
      return;
    }

    // Only resume if there are messages and the last one is from user
    if (initialMessages.length === 0) {
      return;
    }

    const mostRecentMessage = initialMessages.at(-1);

    if (mostRecentMessage?.role === "user") {
      hasResumedRef.current = true;
      // Wrap in try-catch to handle 404 errors gracefully
      resumeStream().catch((error) => {
        console.warn("[useAutoResume] Failed to resume stream:", error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResume]);

  useEffect(() => {
    if (!dataStream || dataStream.length === 0) {
      return;
    }

    const dataPart = dataStream[0];

    if (dataPart.type === "data-appendMessage") {
      const message = JSON.parse(dataPart.data);
      setMessages([...initialMessages, message]);
    }
  }, [dataStream, initialMessages, setMessages]);
}
