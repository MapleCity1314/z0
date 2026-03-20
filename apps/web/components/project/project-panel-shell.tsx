"use client";

import { AnimatePresence } from "framer-motion";
import {
  Code2,
  Download,
  Hammer,
  Loader2,
  Monitor,
  Package,
  Play,
  Save,
  Square,
  X,
} from "lucide-react";
import { Button } from "@z0/ui/button";
import { cn } from "@/lib/utils";
import { ProjectEditor } from "@/components/editor/project-editor";
import { ProjectLoading } from "./project-loading";
import { Terminal } from "./terminal";
import { WebView } from "./web-view";
import type { ProjectFiles } from "./project-panel-utils";
import type { ConsoleLogEntry } from "@/lib/project/web-container-builder";

type ProjectPanelStatus = "idle" | "initializing" | "ready" | "error";

type ProjectPanelHeaderProps = {
  status: ProjectPanelStatus;
  viewMode: "editor" | "preview" | "split";
  onClose: () => void;
  onViewModeChange: (mode: "editor" | "preview") => void;
};

export function ProjectPanelHeader({
  status,
  viewMode,
  onClose,
  onViewModeChange,
}: ProjectPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-zinc-800 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <Code2 className="size-5 text-zinc-400" />
        <h2 className="text-sm font-semibold text-white">Project</h2>
        {status === "initializing" ? (
          <Loader2 className="size-4 animate-spin text-zinc-400" />
        ) : null}
        {status === "ready" ? (
          <span className="text-xs text-green-400">● Ready</span>
        ) : null}
        {status === "error" ? (
          <span className="text-xs text-red-400">● Error</span>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <div className="mr-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange("editor")}
            className={cn(
              "h-7 px-2 text-xs",
              viewMode === "editor" && "bg-zinc-800 text-white",
            )}
          >
            <Code2 className="mr-1 size-3.5" />
            Code
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange("preview")}
            className={cn(
              "h-7 px-2 text-xs",
              viewMode === "preview" && "bg-zinc-800 text-white",
            )}
          >
            <Monitor className="mr-1 size-3.5" />
            Preview
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

type ProjectPanelToolbarProps = {
  isBuilding: boolean;
  isExporting: boolean;
  isInstalling: boolean;
  isServerRunning: boolean;
  canExport: boolean;
  status: ProjectPanelStatus;
  onBuild: () => void;
  onExport: () => void;
  onInstall: () => void;
  onStartServer: () => void;
  onStopServer: () => void;
};

export function ProjectPanelToolbar({
  isBuilding,
  isExporting,
  isInstalling,
  isServerRunning,
  canExport,
  status,
  onBuild,
  onExport,
  onInstall,
  onStartServer,
  onStopServer,
}: ProjectPanelToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-zinc-800 border-b bg-zinc-950 px-4 py-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onInstall}
        disabled={isInstalling || status !== "ready"}
        className="h-7 px-2 text-xs"
      >
        {isInstalling ? (
          <Loader2 className="mr-1 size-3.5 animate-spin" />
        ) : (
          <Package className="mr-1 size-3.5" />
        )}
        Install
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onBuild}
        disabled={isBuilding || status !== "ready"}
        className="h-7 px-2 text-xs"
      >
        {isBuilding ? (
          <Loader2 className="mr-1 size-3.5 animate-spin" />
        ) : (
          <Hammer className="mr-1 size-3.5" />
        )}
        Build
      </Button>

      {isServerRunning ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onStopServer}
          disabled={status !== "ready"}
          className="h-7 px-2 text-red-400 text-xs hover:text-red-300"
        >
          <Square className="mr-1 size-3.5" />
          Stop
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={onStartServer}
          disabled={status !== "ready"}
          className="h-7 px-2 text-green-400 text-xs hover:text-green-300"
        >
          <Play className="mr-1 size-3.5" />
          Run
        </Button>
      )}

      <div className="mx-1 h-4 w-px bg-zinc-700" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onExport}
        disabled={isExporting || !canExport}
        className="h-7 px-2 text-blue-400 text-xs hover:text-blue-300"
      >
        {isExporting ? (
          <Loader2 className="mr-1 size-3.5 animate-spin" />
        ) : (
          <Download className="mr-1 size-3.5" />
        )}
        Export
      </Button>
    </div>
  );
}

export function ProjectPanelEmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-black">
      <div className="flex items-center justify-between border-zinc-800 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Code2 className="size-5 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Project</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-zinc-500">
        <Code2 className="mb-4 size-12 text-zinc-600" />
        <p className="mb-2 text-center text-sm">No project selected</p>
        <p className="text-center text-xs text-zinc-600">
          Create a new project or ask AI to build something for you
        </p>
      </div>
    </div>
  );
}

type ProjectPanelContentProps = {
  errorMessage: string | null;
  files: ProjectFiles;
  hasUnsavedChanges: boolean;
  isGenerating: boolean;
  isLoading: boolean;
  isSaving: boolean;
  logs: ConsoleLogEntry[];
  projectId: string;
  serverUrl: string | null;
  terminalCollapsed: boolean;
  viewMode: "editor" | "preview" | "split";
  onClearLogs: () => void;
  onFileChange: (path: string, content: string) => Promise<void>;
  onSave: () => void;
  onToggleTerminal: () => void;
};

export function ProjectPanelContent({
  errorMessage,
  files,
  hasUnsavedChanges,
  isGenerating,
  isLoading,
  isSaving,
  logs,
  projectId,
  serverUrl,
  terminalCollapsed,
  viewMode,
  onClearLogs,
  onFileChange,
  onSave,
  onToggleTerminal,
}: ProjectPanelContentProps) {
  return (
    <>
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-zinc-400" />
          </div>
        ) : errorMessage ? (
          <div className="flex h-full items-center justify-center text-sm text-red-400">
            {errorMessage}
          </div>
        ) : viewMode === "editor" ? (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <ProjectEditor files={files} onFileChange={onFileChange} />
            </div>

            {hasUnsavedChanges ? (
              <div className="flex items-center justify-end gap-2 border-zinc-800 border-t bg-zinc-900/50 px-4 py-2">
                <span className="text-xs text-yellow-400">Unsaved changes</span>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSave}
                  disabled={isSaving}
                  className="h-7 bg-green-600 px-3 text-xs hover:bg-green-500"
                >
                  {isSaving ? (
                    <Loader2 className="mr-1 size-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1 size-3.5" />
                  )}
                  Save
                </Button>
              </div>
            ) : null}

            <div
              className={cn(
                "border-zinc-800 border-t transition-all",
                terminalCollapsed ? "h-10" : "h-48",
              )}
            >
              <Terminal
                logs={logs}
                onClear={onClearLogs}
                collapsed={terminalCollapsed}
                onToggleCollapse={onToggleTerminal}
              />
            </div>
          </div>
        ) : (
          <WebView url={serverUrl} projectId={projectId} />
        )}
      </div>

      <AnimatePresence>{isGenerating ? <ProjectLoading /> : null}</AnimatePresence>
    </>
  );
}
