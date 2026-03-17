"use client";

import {
  Message,
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
} from "@/components/ai-elements/message";
import { renderMessagePart } from "@/components/chat/message-part-renderers";
import { getMessageCopyText } from "@/lib/agent/chat/message-part-rendering";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { CheckIcon, CopyIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { Fragment, useState, type ComponentProps, type ReactNode } from "react";

export type MessageListProps = ComponentProps<"div"> & {
  messages: UIMessage[];
  isStreaming?: boolean;
  showAssistantLoading?: boolean;
  onRetry?: (messageIndex: number) => void;
};

function AssistantLoadingIndicator({
  optimistic = false,
}: {
  optimistic?: boolean;
}) {
  return (
    <Message from="assistant">
      <MessageContent>
        <div className="flex items-center gap-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">
          <Loader2Icon className="size-4 animate-spin" />
          <span>{optimistic ? "Thinking..." : "Generating response..."}</span>
        </div>
      </MessageContent>
    </Message>
  );
}

function MessageActionButtons({
  isStreaming,
  isUser = false,
  message,
  onRetry,
}: {
  isStreaming?: boolean;
  isUser?: boolean;
  message: UIMessage;
  onRetry?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getMessageCopyText(message));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  if (isStreaming) {
    return null;
  }

  return (
    <MessageActions
      className={cn(
        "mt-1 opacity-0 transition-opacity group-hover:opacity-100",
        isUser && "ml-auto",
      )}
    >
      <MessageAction
        tooltip={copied ? "Copied!" : "Copy"}
        onClick={handleCopy}
        className="text-zinc-500 hover:text-zinc-300"
      >
        {copied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </MessageAction>
      {onRetry ? (
        <MessageAction
          tooltip="Retry"
          onClick={onRetry}
          className="text-zinc-500 hover:text-zinc-300"
        >
          <RefreshCwIcon className="size-3.5" />
        </MessageAction>
      ) : null}
    </MessageActions>
  );
}

function renderMessage(
  message: UIMessage,
  index: number,
  isStreaming: boolean,
  onRetry?: (messageIndex: number) => void,
): ReactNode {
  const { parts = [], role } = message;

  if (role === "user") {
    const textParts = parts.filter((part) => part.type === "text");
    const fileParts = parts.filter((part) => part.type === "file");

    return (
      <Message key={index} from={role}>
        <MessageContent>
          {fileParts.length > 0 ? (
            <MessageAttachments>
              {fileParts.map((part, partIndex) => (
                <MessageAttachment key={partIndex} data={part} />
              ))}
            </MessageAttachments>
          ) : null}
          {textParts.map((part, partIndex) => (
            <p key={partIndex} className="whitespace-pre-wrap break-words">
              {part.text}
            </p>
          ))}
        </MessageContent>
        <MessageActionButtons
          message={message}
          isStreaming={isStreaming}
          isUser
        />
      </Message>
    );
  }

  return (
    <Message key={index} from={role}>
      <MessageContent>
        {parts.map((part, partIndex) => renderMessagePart(part, partIndex))}
      </MessageContent>
      <MessageActionButtons
        message={message}
        onRetry={onRetry ? () => onRetry(index) : undefined}
        isStreaming={isStreaming}
      />
    </Message>
  );
}

export function MessageList({
  className,
  isStreaming = false,
  messages,
  onRetry,
  showAssistantLoading = false,
  ...props
}: MessageListProps) {
  if (!messages || messages.length === 0) {
    return null;
  }

  const lastAssistantIndex = messages.reduce((lastIndex, message, index) => {
    return message.role === "assistant" ? index : lastIndex;
  }, -1);
  const lastUserIndex = messages.reduce((lastIndex, message, index) => {
    return message.role === "user" ? index : lastIndex;
  }, -1);
  const hasAssistantForCurrentTurn = lastAssistantIndex > lastUserIndex;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {messages.map((message, index) => {
        const isLastMessage = index === messages.length - 1;
        const messageIsStreaming = isStreaming && isLastMessage;
        const showLoadingAfterThisMessage =
          showAssistantLoading &&
          hasAssistantForCurrentTurn &&
          index === lastAssistantIndex;

        return (
          <Fragment key={message.id || index}>
            {renderMessage(message, index, messageIsStreaming, onRetry)}
            {showLoadingAfterThisMessage ? <AssistantLoadingIndicator /> : null}
          </Fragment>
        );
      })}
      {showAssistantLoading && !hasAssistantForCurrentTurn ? (
        <AssistantLoadingIndicator optimistic />
      ) : null}
    </div>
  );
}
