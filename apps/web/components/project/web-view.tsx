"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface WebViewProps {
  url: string | null;
  projectId?: string | null;
  isLoading?: boolean;
  className?: string;
}

export function WebView({ url, projectId, isLoading = false, className }: WebViewProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [loadError, setLoadError] = useState(false);

  // 重置错误状态当 URL 变化时
  useEffect(() => {
    setLoadError(false);
  }, []);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
    setLoadError(false);
  };

  const handleOpenExternal = () => {
    if (url) {
      // 生成唯一的会话 ID
      const sessionId = crypto.randomUUID().split('-')[0];
      // 打开全屏预览页面，传递 URL 和 projectId
      const fullscreenUrl = `/api/webcontainer/connect/${sessionId}?url=${encodeURIComponent(url)}&projectId=${projectId || ''}`;
      window.open(fullscreenUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleIframeError = () => {
    setLoadError(true);
  };

  if (!url) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800",
          className
        )}
      >
        <div className="text-center text-zinc-500">
          <div className="mb-2">
            <ExternalLink className="size-12 mx-auto text-zinc-700" />
          </div>
          <p className="text-sm">No preview available</p>
          <p className="text-xs text-zinc-600 mt-1">
            Start the dev server to see preview
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden",
        className
      )}
    >
      {/* URL 输入框工具栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex-1 flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5">
          <span className="text-xs text-zinc-500 shrink-0">URL:</span>
          <input
            type="text"
            value={url || ""}
            readOnly
            className="flex-1 bg-transparent text-xs text-zinc-400 font-mono outline-none"
            placeholder="No server running"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-zinc-400 hover:text-white"
            onClick={handleRefresh}
            disabled={isLoading || !url}
            title="Refresh"
          >
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-zinc-400 hover:text-white"
            onClick={handleOpenExternal}
            disabled={!url}
            title="Open in new tab"
          >
            <ExternalLink className="size-4" />
          </Button>
        </div>
      </div>

      {/* iframe 预览 */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 z-10">
            <div className="text-center">
              <RefreshCw className="size-8 animate-spin text-zinc-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Loading preview...</p>
            </div>
          </div>
        )}

        {loadError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
            <div className="text-center text-zinc-500">
              <AlertCircle className="size-12 mx-auto mb-2 text-red-500" />
              <p className="text-sm">Failed to load preview</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleRefresh}
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <iframe
            key={iframeKey}
            src={url}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            onError={handleIframeError}
            title="Preview"
          />
        )}
      </div>
    </div>
  );
}
