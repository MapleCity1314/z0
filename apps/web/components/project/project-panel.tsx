"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/project";
import { useWebContainer, useWebContainerLogs } from "@/hooks/use-web-container";
import { toast } from "sonner";
import { getProjectInfoAction, updateProjectFilesAction } from "@/lib/project/db/project-actions";
import {
  ProjectPanelContent,
  ProjectPanelEmptyState,
  ProjectPanelHeader,
  ProjectPanelToolbar,
} from "./project-panel-shell";
import {
  convertProjectFilesToFileSystemTree,
  hasProjectFileChanges,
  type ProjectFiles,
} from "./project-panel-utils";

export function ProjectPanel() {
  const {
    isOpen,
    projectId,
    viewMode,
    isGenerating,
    fileUpdateTrigger,
    closePanel,
    setViewMode,
  } = useProjectStore();

  const [files, setFiles] = useState<ProjectFiles>({});
  const [originalFiles, setOriginalFiles] = useState<ProjectFiles>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);

  const {
    status,
    error,
    serverUrl,
    isServerRunning,
    updateFile,
    installDependencies,
    runBuild,
    startDevServer,
    stopServer,
    clearConsoleLogs,
    mountFiles,
  } = useWebContainer({
    projectId: projectId || "",
    autoInitialize: !!projectId,
  });

  const logs = useWebContainerLogs(projectId || "", 1000);

  const loadProjectFiles = async (showLoading = true) => {
    if (!projectId) return;

    if (showLoading) setIsLoading(true);
    try {
      const result = await getProjectInfoAction(projectId);

      if (result.success && result.data) {
        const projectFiles =
          (result.data.files as Record<string, string> | undefined) || {};

        setFiles(projectFiles);
        setOriginalFiles(projectFiles);

        if (Object.keys(projectFiles).length === 0 && showLoading) {
          toast.error("Project has no files");
        }

        return projectFiles;
      }

      if (showLoading) toast.error(result.error || "Failed to load project");
    } catch (err) {
      if (showLoading) toast.error("Failed to load project");
    } finally {
      if (showLoading) setIsLoading(false);
    }
    return null;
  };

  useEffect(() => {
    void loadProjectFiles();
  }, [projectId]);

  const prevFileUpdateTriggerRef = useRef(fileUpdateTrigger);

  useEffect(() => {
    const prevTrigger = prevFileUpdateTriggerRef.current;
    prevFileUpdateTriggerRef.current = fileUpdateTrigger;

    if (fileUpdateTrigger > prevTrigger && projectId && status === "ready") {
      const syncTimeout = window.setTimeout(async () => {
        const nextFiles = await loadProjectFiles(false);

        if (!nextFiles || Object.keys(nextFiles).length === 0) {
          return;
        }

        for (const [filePath, content] of Object.entries(nextFiles)) {
          if (files[filePath] === content) {
            continue;
          }

          try {
            await updateFile(filePath, content);
          } catch {
            toast.error(`Failed to sync ${filePath}`);
          }
        }
      }, 300);

      return () => {
        window.clearTimeout(syncTimeout);
      };
    }
  }, [fileUpdateTrigger, projectId, status, files, updateFile]);

  useEffect(() => {
    const mountProjectFiles = async () => {
      if (status !== "ready" || Object.keys(files).length === 0) return;

      try {
        const fileTree = convertProjectFilesToFileSystemTree(files);
        await mountFiles(fileTree);
        toast.success("Project files loaded");
      } catch {
        toast.error("Failed to mount project files");
      }
    };

    void mountProjectFiles();
  }, [status, files, mountFiles]);

  const handleFileChange = async (path: string, content: string) => {
    setFiles((current) => ({ ...current, [path]: content }));

    try {
      await updateFile(path, content);
    } catch {
      toast.error(`Failed to update ${path}`);
    }
  };

  const hasUnsavedChanges = useCallback(
    () => hasProjectFileChanges(files, originalFiles),
    [files, originalFiles],
  );

  const handleSaveToDatabase = async () => {
    if (!projectId || !hasUnsavedChanges()) return;

    setIsSaving(true);
    try {
      const result = await updateProjectFilesAction(projectId, files);
      if (result.success) {
        setOriginalFiles(files);
        toast.success("Changes saved");
      } else {
        toast.error(result.error || "Failed to save changes");
      }
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installDependencies();
      toast.success("Dependencies installed");
    } catch {
      toast.error("Failed to install dependencies");
    } finally {
      setIsInstalling(false);
    }
  };

  const handleBuild = async () => {
    setIsBuilding(true);
    try {
      await runBuild("production");
      toast.success("Build completed");
    } catch {
      toast.error("Build failed");
    } finally {
      setIsBuilding(false);
    }
  };

  const handleStartServer = async () => {
    try {
      await startDevServer(3000);
      toast.success("Dev server started");
    } catch {
      toast.error("Failed to start server");
    }
  };

  const handleStopServer = async () => {
    try {
      await stopServer();
      toast.success("Server stopped");
    } catch {
      toast.error("Failed to stop server");
    }
  };

  const handleExport = async () => {
    if (!projectId) return;

    setIsExporting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/export`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || "project.zip";

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Project exported successfully");
    } catch {
      toast.error("Failed to export project");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  if (!projectId) {
    return <ProjectPanelEmptyState onClose={closePanel} />;
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-black">
      <ProjectPanelHeader
        status={status}
        viewMode={viewMode}
        onClose={closePanel}
        onViewModeChange={setViewMode}
      />
      <ProjectPanelToolbar
        isBuilding={isBuilding}
        isExporting={isExporting}
        isInstalling={isInstalling}
        isServerRunning={isServerRunning}
        canExport={Object.keys(files).length > 0}
        status={status}
        onBuild={() => void handleBuild()}
        onExport={() => void handleExport()}
        onInstall={() => void handleInstall()}
        onStartServer={() => void handleStartServer()}
        onStopServer={() => void handleStopServer()}
      />
      <ProjectPanelContent
        errorMessage={error?.message ?? null}
        files={files}
        hasUnsavedChanges={hasUnsavedChanges()}
        isGenerating={isGenerating}
        isLoading={isLoading}
        isSaving={isSaving}
        logs={logs}
        projectId={projectId}
        serverUrl={serverUrl}
        terminalCollapsed={terminalCollapsed}
        viewMode={viewMode}
        onClearLogs={clearConsoleLogs}
        onFileChange={handleFileChange}
        onSave={() => void handleSaveToDatabase()}
        onToggleTerminal={() => setTerminalCollapsed((current) => !current)}
      />
    </div>
  );
}
