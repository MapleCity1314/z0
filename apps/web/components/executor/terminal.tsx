"use client";

import { cn } from "@/lib/utils";
import { useExecutorStore, type ExecutionResult } from "@/store/executor";
import { ChevronDownIcon, TerminalIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function Terminal() {
  const { results, isExecuting, clearResults, terminalCollapsed, toggleTerminal } = useExecutorStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results]);

  return (
    <div className={cn(
      "flex flex-col border-t border-zinc-800 transition-all duration-200",
      terminalCollapsed ? "h-10" : "h-full"
    )}>
      {/* Terminal Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 cursor-pointer select-none"
        onClick={toggleTerminal}
      >
        <div className="flex items-center gap-2 text-zinc-400">
          <TerminalIcon className="size-4" />
          <span className="text-xs font-medium">Terminal</span>
          {terminalCollapsed && results.length > 0 && (
            <span className="text-[10px] text-zinc-500">
              ({results.length} output{results.length > 1 ? "s" : ""})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-zinc-500 hover:text-zinc-300"
            onClick={(e) => {
              e.stopPropagation();
              clearResults();
            }}
          >
            <Trash2Icon className="size-3" />
          </Button>
          <ChevronDownIcon 
            className={cn(
              "size-4 text-zinc-500 transition-transform duration-200",
              terminalCollapsed && "rotate-180"
            )} 
          />
        </div>
      </div>

      {/* Terminal Content */}
      {!terminalCollapsed && (
        <div
          ref={scrollRef}
          className={cn(
            "flex-1 overflow-auto p-3 bg-zinc-950 font-mono text-xs",
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full"
          )}
          style={{ fontFamily: "'Fira Code', monospace" }}
        >
          {results.length === 0 ? (
            <div className="text-zinc-600 select-none">
              {isExecuting ? "Executing..." : "Ready to execute code"}
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => (
                <TerminalOutput key={result.timestamp} result={result} index={index} />
              ))}
              {isExecuting && (
                <div className="text-zinc-500 animate-pulse">Running...</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TerminalOutput({ result, index }: { result: ExecutionResult; index: number }) {
  return (
    <div className="space-y-1">
      <div className="text-zinc-500 text-[10px]">
        [{index + 1}] {new Date(result.timestamp).toLocaleTimeString()}
      </div>
      {result.output && (
        <pre className="text-green-400 whitespace-pre-wrap break-all">
          {result.output}
        </pre>
      )}
      {result.error && (
        <pre className="text-red-400 whitespace-pre-wrap break-all">
          {result.error}
        </pre>
      )}
    </div>
  );
}
