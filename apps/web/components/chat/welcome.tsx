"use client";

import { Logo } from "@/components/logo";
import { useEffect, useState } from "react";

const WELCOME_MESSAGES = [
  "蓄势待发。",
  "从这里，构建一切。",
  "思考。执行。交付。",
  "今天有什么计划？",
  "准备开始。",
  "随时为你效劳。",
  "让我们专注当下。",
  "准备解锁新的可能。",
  "保持创造。",
  "继续构建你的世界。",
  "保持灵感流动。",
] as const;

export function Welcome() {
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    setMessage(
      WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)],
    );
  }, []);

  return (
    <div className="flex w-full items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-center gap-4 md:gap-5">
        <Logo
          size={44}
          className="shrink-0 text-zinc-900 dark:text-neutral-100 md:size-[52px]"
        />
        <h1 className="text-center font-serif text-3xl font-semibold tracking-tight text-zinc-800 dark:text-neutral-100 md:text-4xl">
          {message}
        </h1>
      </div>
    </div>
  );
}
