"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// 提出组件外，避免每次重新生成
const WELCOME_MESSAGES = [
  "蓄势待发。",
  "今天有什么计划？",
  "我已就绪。",
  "准备开始。",
  "随时为你效劳。",
  "让我们专注当下。",
  "保持节奏，继续前进。",
  "新的想法，正在酝酿。",
  "需要我做什么？",
  "你的思路，我来延伸。",
  "准备解锁新的可能。",
  "安静启动。",
  "一切已准备完毕。",
  "向前一步。",
  "从此刻开始。",
  "保持创造。",
  "继续构建你的世界。",
  "你的项目，我来辅助。",
  "我们开始吧。",
  "保持灵感流动。"
] as const;

export function Welcome() {
  // 1. 用 state 保存要显示的文字
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    // 2. 只在客户端随机一次，避免服务端和客户端渲染不一致
    setMessage(
      WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
    );
  }, []); // 3. 空依赖，只执行一次

  return (
    <div className="flex flex-col items-center justify-center w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h1 className="text-3xl md:text-4xl font-semibold text-center tracking-tight text-zinc-800 dark:text-neutral-100">
        {message}
      </h1>
    </div>
  );
}