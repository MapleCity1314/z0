"use client";

import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Terminal as TerminalIcon, Trash2, Copy, Check, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@z0/ui/button";
import type { ConsoleLogEntry } from "@/lib/project/web-container-builder";

export interface TerminalProps {
  logs: ConsoleLogEntry[];
  onClear?: () => void;
  className?: string;
  maxHeight?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// 清理 ANSI 转义序列
function stripAnsi(text: string): string {
  // 移除 ANSI 颜色代码和控制序列
  return text
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '') // ANSI 转义序列
    .replace(/\x1B\[[\d;]*m/g, '')         // 颜色代码
    .replace(/\x1B\[\d*[GK]/g, '')         // 光标移动和清除序列
    .replace(/\r/g, '')                     // 回车符
    .trim();
}

// 过滤无效日志（如旋转动画字符）
function isValidLog(message: string): boolean {
  const cleaned = stripAnsi(message);
  // 过滤掉只包含单个旋转动画字符的日志
  if (/^[-\\|/]$/.test(cleaned)) return false;
  // 过滤掉空消息
  if (!cleaned) return false;
  // 过滤掉只有控制字符的消息
  if (/^[\x00-\x1F\x7F]*$/.test(cleaned)) return false;
  return true;
}

export function Terminal({
  logs,
  onClear,
  className,
  maxHeight = "300px",
  collapsed = false,
  onToggleCollapse,
}: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // 过滤有效日志
  const filteredLogs = logs.filter(log => isValidLog(log.message));

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll, collapsed]);

  // 检测用户是否手动滚动
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const handleCopy = async () => {
    const text = filteredLogs.map((log) => `[${log.level}] ${stripAnsi(log.message)}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelColor = (level: ConsoleLogEntry["level"]) => {
    switch (level) {
      case "error":
        return "text-red-400";
      case "warn":
        return "text-yellow-400";
      case "info":
        return "text-blue-400";
      case "debug":
        return "text-purple-400";
      default:
        return "text-zinc-300";
    }
  };

  const getLevelBadge = (level: ConsoleLogEntry["level"]) => {
    switch (level) {
      case "error":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "warn":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "info":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "debug":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden",
        className
      )}
    >
      {/* 标题栏 */}
      <div 
        className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 cursor-pointer"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <TerminalIcon className="size-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Terminal
          </span>
          {filteredLogs.length > 0 && (
            <span className="text-xs text-zinc-600">({filteredLogs.length})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {filteredLogs.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-zinc-400 hover:text-white"
                onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleCopy(); }}
                title="Copy logs"
              >
                {copied ? (
                  <Check className="size-3" />
                ) : (
                  <Copy className="size-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-zinc-400 hover:text-red-400"
                onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onClear?.(); }}
                title="Clear logs"
              >
                <Trash2 className="size-3" />
              </Button>
            </>
          )}
          {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-zinc-400 hover:text-white"
                onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onToggleCollapse(); }}
                title={collapsed ? "Expand terminal" : "Collapse terminal"}
              >
              {collapsed ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>
          )}
        </div>
      </div>

      {/* 日志内容 */}
      {!collapsed && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-[120px] overflow-y-auto font-mono text-xs p-3 space-y-1"
          style={{ maxHeight }}
        >
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[100px] text-zinc-600">
              <div className="text-center">
                <TerminalIcon className="size-8 mx-auto mb-2 text-zinc-700" />
                <p className="text-xs">No logs yet</p>
              </div>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 py-1 hover:bg-zinc-900/50 rounded px-2 -mx-2"
              >
                <span
                  className={cn(
                    "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border uppercase",
                    getLevelBadge(log.level)
                  )}
                >
                  {log.level}
                </span>
                <span className="text-zinc-600 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <pre
                  className={cn(
                    "flex-1 whitespace-pre-wrap wrap-break-word",
                    getLevelColor(log.level)
                  )}
                >
                  {stripAnsi(log.message)}
                </pre>
              </div>
            ))
          )}
        </div>
      )}

      {/* 自动滚动指示器 */}
      {!collapsed && !autoScroll && filteredLogs.length > 0 && (
        <div className="px-3 py-1 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={() => {
              setAutoScroll(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ↓ Scroll to bottom
          </button>
        </div>
      )}
    </div>
  );
}
