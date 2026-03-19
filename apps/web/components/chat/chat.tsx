"use client";

import { DefaultChatTransport, type UIMessage, type FileUIPart } from "ai";
import { unstable_serialize, useSWRConfig } from "swr";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { cn, fetchWithErrorHandlers } from "@/lib/utils";
import { ChatSDKError } from "@/lib/error";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { motion, AnimatePresence } from "framer-motion";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "../ai-elements/conversation";
import { Bot } from "lucide-react";
import { MessageList } from "./message-list";
import { Welcome } from "./welcome";
import { ChatInput } from "./chat-input";
import {
  CHAT_COLUMN_WIDTH_CLASS,
  CHAT_COLUMN_WIDTH_COMPACT_CLASS,
} from "./layout";
import FluidBackground from "../fluid-background";
import {
  buildOutgoingUserMessage,
  getChatToolEffects,
  isProjectGenerationActive,
} from "@/lib/agent/chat/client-state";
import { selectableModels, type SelectableModelName } from "@/lib/agent/model";
import { useProjectStore } from "@/store/project";
import { useUserStore } from "@/store/user";

interface ChatProps {
  id: string;
  initialMessages: UIMessage[];
  autoResume: boolean;
  isNewChat?: boolean;
  welcomeMessage?: string;
  projectId?: string | null;
}

export default function Chat({
  id,
  initialMessages,
  autoResume,
  isNewChat = false,
  projectId: initialProjectId = null,
}: ChatProps) {
  const { mutate } = useSWRConfig();
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [selectedModel, setSelectedModel] =
    useState<SelectableModelName>("z0-pro");
  const [studioModeEnabled, setStudioModeEnabled] = useState(
    Boolean(initialProjectId),
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjectId,
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const currentUserId = useUserStore((state) => state.user?.id ?? null);
  const setStoreProjectId = useProjectStore((s) => s.setProjectId);
  const setGenerating = useProjectStore((s) => s.setGenerating);
  const triggerFileUpdate = useProjectStore((s) => s.triggerFileUpdate);

  // 初始化时设置项目 ID
  // 当 Chat 组件挂载时（包括切换对话），根据 initialProjectId 更新 store
  useEffect(() => {
    const urlProjectId = searchParams.get("projectId");
    const effectiveProjectId = urlProjectId || initialProjectId || null;

    console.log(
      "[Chat] Initializing/switching chat, projectId:",
      effectiveProjectId,
    );
    setStudioModeEnabled(Boolean(effectiveProjectId));
    setSelectedProjectId(effectiveProjectId);
    // 始终更新 store（包括设置为 null 来关闭面板）
    setStoreProjectId(effectiveProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // 依赖 id，当切换对话时重新执行

  // 监听 URL 中的 projectId 变化（用户通过 URL 打开项目）
  useEffect(() => {
    const urlProjectId = searchParams.get("projectId");
    if (urlProjectId && urlProjectId !== selectedProjectId) {
      console.log("[Chat] URL projectId changed:", urlProjectId);
      setStudioModeEnabled(true);
      setSelectedProjectId(urlProjectId);
      setStoreProjectId(urlProjectId);
    }
  }, [searchParams, selectedProjectId, setStoreProjectId]);

  // 使用 ref 来避免闭包问题
  const webSearchRef = useRef(webSearchEnabled);
  const thinkingRef = useRef(thinkingEnabled);
  const studioModeRef = useRef(studioModeEnabled);
  const modelRef = useRef(selectedModel);
  const projectIdRef = useRef(selectedProjectId);

  useEffect(() => {
    webSearchRef.current = webSearchEnabled;
  }, [webSearchEnabled]);

  useEffect(() => {
    thinkingRef.current = thinkingEnabled;
  }, [thinkingEnabled]);

  useEffect(() => {
    modelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    studioModeRef.current = studioModeEnabled;
  }, [studioModeEnabled]);

  useEffect(() => {
    projectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    resumeStream,
    addToolOutput,
  } = useChat({
    id,
    messages: initialMessages,
    experimental_throttle: 150,

    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,

      prepareSendMessagesRequest(options) {
        const currentModelId = modelRef.current;
        const currentWebSearch = webSearchRef.current;
        const currentThinking = thinkingRef.current;
        const currentProjectId = studioModeRef.current
          ? projectIdRef.current
          : null;

        console.log("[Client] Sending request:", {
          model: currentModelId,
          isReasoning: currentThinking,
          webSearchEnabled: currentWebSearch,
          projectId: currentProjectId || "none",
        });

        return {
          body: {
            id,
            messages: options.messages,
            model: currentModelId,
            webSearchEnabled: currentWebSearch,
            isReasoning: currentThinking,
            projectId: currentProjectId,
          },
          headers: {
            ...options.headers,
          },
        };
      },

      prepareReconnectToStreamRequest() {
        return {
          headers: {
            "x-chat-reconnect": "1",
          },
        };
      },
    }),

    onToolCall: async ({ toolCall }) => {
      try {
        if (toolCall.toolName === "web_search") {
          const result = { results: [] };

          addToolOutput({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
        }
      } catch (err) {
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: (err as Error).message,
        });
      }
    },

    onFinish: () => {
      mutate(unstable_serialize(["chat-history", id]));
    },

    onError: (error) => {
      console.error("Chat error:", error);
      if (error instanceof ChatSDKError) {
        const causeText =
          typeof error.cause === "string" && error.cause.length > 0
            ? ` (${error.cause})`
            : "";
        toast.error(`${error.message}${causeText}`);
        return;
      }
      toast.error("Unknown error occurred");
    },
  });

  const query = searchParams.get("query");
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  // 🔧 FIX: 处理 URL query 参数（例如从搜索框跳转过来的场景）
  useEffect(() => {
    if (query && !hasAppendedQuery) {
      // 发送 query 参数中的消息
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);

      // 清理 URL 中的 query 参数，跳转到干净的对话页面
      // 路由结构：app/(app)/c/[id] → URL: /c/{id}
      router.replace(`/c/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id, router]);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  // 检测工具执行完成，处理项目创建和文件更新
  // 使用 ref 跟踪已处理的工具调用，避免重复处理
  const handledToolCallsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const effects = getChatToolEffects(messages, handledToolCallsRef.current);
    handledToolCallsRef.current = effects.nextHandledToolCallIds;

    if (effects.projectIdToOpen) {
      console.log(
        "[Chat] Detected createProject success, opening panel:",
        effects.projectIdToOpen,
      );
      setSelectedProjectId(effects.projectIdToOpen);
      setStoreProjectId(effects.projectIdToOpen);
    }

    if (effects.shouldTriggerFileUpdate) {
      console.log("[Chat] Triggering file update for ProjectPanel");
      triggerFileUpdate();
    }
  }, [messages, setStoreProjectId, triggerFileUpdate]);

  useEffect(() => {
    setGenerating(isProjectGenerationActive(messages, selectedProjectId));
  }, [messages, selectedProjectId, setGenerating]);

  const showWelcome = messages.length === 0 && isNewChat;
  const showAssistantLoading =
    (status === "submitted" || status === "streaming") &&
    messages.some((message) => message.role === "user");
  const isDarkTheme = resolvedTheme === "dark";
  const conversationResizeBehavior =
    status === "streaming" ? "instant" : "smooth";

  // Track if we need to update URL after chat creation
  const pendingUrlUpdateRef = useRef(false);

  // Delay the route change until the first turn is settled. Navigating while the
  // initial response is still streaming can replace the optimistic client state
  // with the server-rendered /c/[id] page before persistence finishes.
  useEffect(() => {
    if (
      pendingUrlUpdateRef.current &&
      status === "ready" &&
      messages.some((message) => message.role === "user")
    ) {
      pendingUrlUpdateRef.current = false;
      window.history.replaceState({}, "", `/c/${id}`);
      mutate("recent-chats");
    }
  }, [status, id, messages, mutate]);

  const handleSendMessage = (message: {
    text: string;
    files: FileUIPart[];
  }) => {
    if (isNewChat && !currentUserId) {
      toast.error("Authentication required");
      return;
    }

    const uiMessage = buildOutgoingUserMessage(message);

    if (showWelcome) {
      pendingUrlUpdateRef.current = true;
    }

    sendMessage(uiMessage);
  };

  const InputComponent = (
    <ChatInput
      chatId={id}
      onSubmit={handleSendMessage}
      status={status}
      messagesLength={messages.length}
      showWelcome={showWelcome}
      webSearchEnabled={webSearchEnabled}
      onWebSearchToggle={() => setWebSearchEnabled(!webSearchEnabled)}
      thinkingEnabled={thinkingEnabled}
      onThinkingToggle={() => setThinkingEnabled(!thinkingEnabled)}
      studioModeEnabled={studioModeEnabled}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      selectedProjectId={selectedProjectId}
      onProjectChange={(projectId) => {
        setSelectedProjectId(projectId);
        // 同步更新 store，这会自动控制面板的显示/隐藏
        if (studioModeEnabled) {
          setStoreProjectId(projectId);
        }
      }}
      onStop={stop}
    />
  );

  return (
    <div className="relative h-full w-full flex flex-col bg-zinc-50 dark:bg-black text-foreground antialiased overflow-hidden group/chat-page transition-colors duration-300">
      <AnimatePresence mode="wait">
        {showWelcome ? (
          /* ================= WELCOME LAYOUT ================= */
          <motion.div
            key="welcome"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative flex h-full w-full flex-col overflow-hidden px-4"
          >
            <div className="pointer-events-none absolute inset-0">
              <FluidBackground isDark={isDarkTheme} />
              <div className="absolute inset-0 bg-zinc-50/35 dark:bg-black/45" />
            </div>
            {/* Desktop: Centered Layout */}
            <div className="relative z-10 hidden h-full w-full flex-col items-center justify-center md:flex">
              <div className={cn(CHAT_COLUMN_WIDTH_COMPACT_CLASS, "translate-y-8 space-y-6")}>
                <Welcome />

                <motion.div
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "calc(50vh - 50%)", opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="w-full"
                >
                  {InputComponent}
                </motion.div>
              </div>
            </div>

            {/* Mobile: Input at Bottom */}
            <div className="relative z-10 flex h-full w-full flex-col md:hidden">
              <div className="flex flex-1 items-center justify-center px-4 pb-36">
                <Welcome />
              </div>
              <motion.div
                initial={{ y: 96, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
                className={cn(
                  "absolute bottom-0 left-0 right-0 border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]",
                  "rounded-t-3xl bg-zinc-50/95 border-zinc-200 backdrop-blur-md",
                  "dark:bg-black/95 dark:border-zinc-800",
                )}
              >
                <div className={CHAT_COLUMN_WIDTH_COMPACT_CLASS}>{InputComponent}</div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          /* ================= CHAT LAYOUT ================= */
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="h-full w-full"
          >
            <Conversation
              className="w-full h-full"
              resize={conversationResizeBehavior}
            >
              <ConversationContent
                className={cn(CHAT_COLUMN_WIDTH_CLASS, "pt-4 pb-48")}
              >
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    icon={
                      <Bot className="size-10 text-zinc-400 dark:text-zinc-600 mb-4" />
                    }
                    title="What can I help you ship?"
                    description="Generate UI, debug code, or brainstorm ideas."
                    className="mt-[20vh]"
                  />
                ) : (
                  <>
                    <MessageList
                      messages={messages}
                      isStreaming={status === "streaming"}
                      showAssistantLoading={showAssistantLoading}
                      onRetry={(messageIndex) => {
                        // Find the user message before this assistant message
                        const userMessageIndex = messageIndex - 1;
                        if (
                          userMessageIndex >= 0 &&
                          messages[userMessageIndex]?.role === "user"
                        ) {
                          // Remove messages from this point and resend
                          const userMessage = messages[userMessageIndex];
                          setMessages(messages.slice(0, userMessageIndex));
                          sendMessage(userMessage);
                        }
                      }}
                    />
                  </>
                )}
              </ConversationContent>
              <ConversationScrollButton
                className={cn(
                  "bottom-32 backdrop-blur-sm transition-all shadow-md",
                  "bg-white/80 hover:bg-zinc-100 text-zinc-700 border-zinc-200", // Light
                  "dark:bg-zinc-900/80 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700", // Dark
                )}
              />
            </Conversation>

            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              className="absolute bottom-0 left-0 w-full z-20 pointer-events-none"
            >
              <div
                className={cn(
                  "absolute bottom-0 left-0 w-full h-40 pointer-events-none bg-gradient-to-t",
                  "from-zinc-50 via-zinc-50/90 to-transparent", // Light
                  "dark:from-black dark:via-black/90 dark:to-transparent", // Dark
                )}
              />
              <div
                className={cn(
                  "relative pb-6 pt-2 pointer-events-auto",
                  CHAT_COLUMN_WIDTH_CLASS,
                )}
              >
                {InputComponent}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="pointer-events-none absolute bottom-1 left-0 right-0 z-30 text-center text-[10px] font-medium text-zinc-400 select-none dark:text-zinc-600">
        Z0 may make mistakes. Please check important information.
      </p>
    </div>
  );
}
