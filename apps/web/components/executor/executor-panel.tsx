"use client";

import { cn } from "@/lib/utils";
import { useExecutorStore } from "@/store/executor";
import { executePython } from "@/lib/agent/executor/python";
import { createHtmlPreview, revokeHtmlPreview } from "@/lib/agent/executor/html";
import {
  executeJava,
  executeGo,
  executeRust,
  executeJavaScript,
  executeTypeScript,
  executeC,
  executeCpp,
} from "@/lib/agent/executor/compiled";
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactActions,
  ArtifactAction,
  ArtifactClose,
  ArtifactContent,
} from "@/components/ai-elements/artifact";
import { Terminal } from "./terminal";
import { CodeIcon, CopyIcon, EyeIcon, PlayIcon, RefreshCwIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  js: "JavaScript",
  ts: "TypeScript",
  html: "HTML",
  java: "Java",
  go: "Go",
  rust: "Rust",
  c: "C",
  cpp: "C++",
  "c++": "C++",
};

export function ExecutorPanel() {
  const {
    isOpen,
    code,
    language,
    closePanel,
    addResult,
    setExecuting,
    isExecuting,
    viewMode,
    setViewMode,
    terminalCollapsed,
  } = useExecutorStore();

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const isHtml = language === "html";

  // Create HTML preview URL when code changes
  useEffect(() => {
    if (isHtml && code) {
      const result = createHtmlPreview(code);
      if (result.success) {
        setPreviewUrl(result.previewUrl);
      }
    }

    return () => {
      if (previewUrl) {
        revokeHtmlPreview(previewUrl);
      }
    };
  }, [code, isHtml]);

  const handleExecute = async () => {
    if (isExecuting) return;

    console.log("已触发 code executor");
    setExecuting(true);

    try {
      if (language === "python") {
        const result = await executePython(code);
        addResult({
          output: result.output,
          error: result.error,
          timestamp: Date.now(),
        });
      } else if (language === "html") {
        // Refresh HTML preview
        if (previewUrl) {
          revokeHtmlPreview(previewUrl);
        }
        const result = createHtmlPreview(code);
        if (result.success) {
          setPreviewUrl(result.previewUrl);
          addResult({
            output: "HTML preview refreshed",
            timestamp: Date.now(),
          });
        } else {
          addResult({
            output: "",
            error: result.error,
            timestamp: Date.now(),
          });
        }
      } else if (language === "java") {
        const result = await executeJava(code);
        addResult({
          output: result.output,
          error: result.error,
          timestamp: Date.now(),
        });
      } else if (language === "go") {
        const result = await executeGo(code);
        addResult({
          output: result.output,
          error: result.error,
          timestamp: Date.now(),
        });
      } else if (language === "rust") {
        const result = await executeRust(code);
        addResult({
          output: result.output,
          error: result.error,
          timestamp: Date.now(),
        });
      } else if (language === "javascript" || language === "js") {
        const result = await executeJavaScript(code);
        addResult({
          output: result.output,
          error: result.error,
          timestamp: Date.now(),
        });
      } else if (language === "typescript" || language === "ts") {
        const result = await executeTypeScript(code);
        addResult({
          output: result.output,
          error: result.error,
          timestamp: Date.now(),
        });
      } else if (language === "c") {
        const result = await executeC(code);
        addResult({
          output: result.output,
          error: result.error,
          timestamp: Date.now(),
        });
      } else if (language === "cpp" || language === "c++") {
        const result = await executeCpp(code);
        addResult({
          output: result.output,
          error: result.error,
          timestamp: Date.now(),
        });
      } else {
        addResult({
          output: `[${LANGUAGE_LABELS[language] || language}] Execution not yet implemented`,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      addResult({
        output: "",
        error: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === "code" ? "preview" : "code");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-200">
                {LANGUAGE_LABELS[language] || language}
              </span>
              
              {/* View Mode Toggle for HTML */}
              {isHtml && (
                <div className="flex items-center bg-zinc-800 rounded-md p-0.5">
                  <button
                    onClick={() => setViewMode("preview")}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                      viewMode === "preview"
                        ? "bg-zinc-700 text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <EyeIcon className="size-3" />
                    Preview
                  </button>
                  <button
                    onClick={() => setViewMode("code")}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                      viewMode === "code"
                        ? "bg-zinc-700 text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <CodeIcon className="size-3" />
                    Code
                  </button>
                </div>
              )}
            </div>

            <ArtifactActions>
              {isHtml && viewMode === "preview" && (
                <ArtifactAction
                  icon={RefreshCwIcon}
                  tooltip="Refresh"
                  onClick={handleExecute}
                  className="text-zinc-400 hover:text-zinc-200"
                />
              )}
              {(!isHtml || viewMode === "code") && (
                <ArtifactAction
                  icon={PlayIcon}
                  tooltip="Run"
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className={cn(
                    isExecuting && "opacity-50 cursor-not-allowed",
                    "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                  )}
                />
              )}
              <ArtifactAction
                icon={CopyIcon}
                tooltip="Copy"
                onClick={handleCopy}
                className="text-zinc-400 hover:text-zinc-200"
              />
              <ArtifactClose
                onClick={closePanel}
                className="text-zinc-400 hover:text-zinc-200"
              />
            </ArtifactActions>
          </div>

          {/* Content Area with custom scrollbar */}
          <div className={cn(
            "flex-1 overflow-auto",
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-zinc-800/60 [&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:hover:bg-zinc-700/80",
            "[&::-webkit-scrollbar-thumb]:transition-colors"
          )}>
            {isHtml && viewMode === "preview" ? (
              /* HTML Preview */
              <iframe
                src={previewUrl}
                className="w-full h-full bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title="HTML Preview"
              />
            ) : (
              /* Code View */
              <ArtifactContent
                enableHighlight
                code={code}
                language={language}
                className="h-full bg-transparent"
              />
            )}
          </div>

          {/* Terminal */}
          <div className={cn(
            "transition-all duration-200",
            terminalCollapsed ? "h-10" : "h-48 min-h-48"
          )}>
            <Terminal />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
