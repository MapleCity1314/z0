"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project";
import { useWebContainer, useWebContainerLogs } from "@/hooks/use-web-container";
import { ProjectEditor } from "@/components/editor/project-editor";
import { WebView } from "./web-view";
import { Terminal } from "./terminal";
import { ProjectLoading } from "./project-loading";
import { Button } from "@/components/ui/button";
import {
  Play,
  Square,
  Package,
  Hammer,
  Code2,
  Monitor,
  Loader2,
  X,
  Save,
  Download,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getProjectInfoAction, updateProjectFilesAction } from "@/lib/project/db/project-actions";

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

  const [files, setFiles] = useState<Record<string, string>>({});
  const [originalFiles, setOriginalFiles] = useState<Record<string, string>>({});
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

  // 加载项目文件的函数
  const loadProjectFiles = async (showLoading = true) => {
    if (!projectId) return;
    
    if (showLoading) setIsLoading(true);
    try {
      console.log("[ProjectPanel] Loading project:", projectId);
      const result = await getProjectInfoAction(projectId);
      
      if (result.success && result.data) {
        const projectFiles = (result.data.files as Record<string, string> | undefined) || {};
        console.log("[ProjectPanel] Loaded", Object.keys(projectFiles).length, "files");
        
        setFiles(projectFiles);
        setOriginalFiles(projectFiles);
        
        if (Object.keys(projectFiles).length === 0 && showLoading) {
          toast.error("Project has no files");
        }
        
        return projectFiles;
      } else {
        console.error("[ProjectPanel] Failed to load project:", result.error);
        if (showLoading) toast.error(result.error || "Failed to load project");
      }
    } catch (err) {
      console.error("[ProjectPanel] Exception:", err);
      if (showLoading) toast.error("Failed to load project");
    } finally {
      if (showLoading) setIsLoading(false);
    }
    return null;
  };

  // 初始加载项目文件
  useEffect(() => {
    loadProjectFiles();
  }, [projectId]);
  
  // 监听 fileUpdateTrigger，当文件操作工具完成时重新加载文件并同步到 WebContainer
  const prevFileUpdateTriggerRef = useRef(fileUpdateTrigger);
  
  useEffect(() => {
    const prevTrigger = prevFileUpdateTriggerRef.current;
    prevFileUpdateTriggerRef.current = fileUpdateTrigger;
    
    // 当 trigger 变化时，重新加载文件
    if (fileUpdateTrigger > prevTrigger && projectId && status === 'ready') {
      console.log("[ProjectPanel] File update triggered, syncing files...");
      
      // 延迟一点确保数据库已更新
      setTimeout(async () => {
        const newFiles = await loadProjectFiles(false);
        
        if (newFiles && Object.keys(newFiles).length > 0) {
          // 同步变化的文件到 WebContainer
          for (const [filePath, content] of Object.entries(newFiles)) {
            if (files[filePath] !== content) {
              console.log("[ProjectPanel] Syncing file:", filePath);
              try {
                await updateFile(filePath, content);
              } catch (err) {
                console.error("[ProjectPanel] Failed to sync file:", filePath, err);
              }
            }
          }
          console.log("[ProjectPanel] ✅ Files synced to WebContainer");
        }
      }, 300);
    }
  }, [fileUpdateTrigger, projectId, status, files, updateFile]);

  // 当文件加载完成且 WebContainer 就绪时，挂载文件
  useEffect(() => {
    async function mountProjectFiles() {
      if (status !== 'ready' || Object.keys(files).length === 0) return;
      
      try {
        console.log("[ProjectPanel] Mounting files to WebContainer...");
        
        // 将 Record<string, string> 转换为 FileSystemTree
        const fileTree = convertToFileSystemTree(files);
        
        await mountFiles(fileTree);
        console.log("[ProjectPanel] ✅ Files mounted successfully");
        toast.success("Project files loaded");
      } catch (err) {
        console.error("[ProjectPanel] Failed to mount files:", err);
        toast.error("Failed to mount project files");
      }
    }
    
    mountProjectFiles();
  }, [status, files, mountFiles]);

  // 辅助函数：将扁平的文件对象转换为 FileSystemTree
  function convertToFileSystemTree(files: Record<string, string>) {
    const tree: any = {};
    
    for (const [path, content] of Object.entries(files)) {
      const parts = path.split('/').filter(Boolean);
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        
        if (isLast) {
          // 文件节点
          current[part] = {
            file: {
              contents: content,
            },
          };
        } else {
          // 目录节点
          if (!current[part]) {
            current[part] = {
              directory: {},
            };
          }
          current = current[part].directory;
        }
      }
    }
    
    return tree;
  }

  // 同步文件变更到 WebContainer（不保存到数据库）
  const handleFileChange = async (path: string, content: string) => {
    setFiles(prev => ({ ...prev, [path]: content }));
    
    try {
      await updateFile(path, content);
    } catch (err) {
      console.error(`Failed to update file ${path}:`, err);
      toast.error(`Failed to update ${path}`);
    }
  };

  // 检查是否有未保存的更改
  const hasUnsavedChanges = useCallback(() => {
    const fileKeys = new Set([...Object.keys(files), ...Object.keys(originalFiles)]);
    for (const key of fileKeys) {
      if (files[key] !== originalFiles[key]) {
        return true;
      }
    }
    return false;
  }, [files, originalFiles]);

  // 保存所有更改到数据库
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
    } catch (err) {
      console.error("[ProjectPanel] Failed to save:", err);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  // 安装依赖
  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installDependencies();
      toast.success("Dependencies installed");
    } catch (err) {
      toast.error("Failed to install dependencies");
    } finally {
      setIsInstalling(false);
    }
  };

  // 构建项目
  const handleBuild = async () => {
    setIsBuilding(true);
    try {
      await runBuild("production");
      toast.success("Build completed");
    } catch (err) {
      toast.error("Build failed");
    } finally {
      setIsBuilding(false);
    }
  };

  // 启动开发服务器
  const handleStartServer = async () => {
    try {
      await startDevServer(3000);
      toast.success("Dev server started");
    } catch (err) {
      toast.error("Failed to start server");
    }
  };

  // 停止服务器
  const handleStopServer = async () => {
    try {
      await stopServer();
      toast.success("Server stopped");
    } catch (err) {
      toast.error("Failed to stop server");
    }
  };

  // 导出项目为 ZIP
  const handleExport = async () => {
    if (!projectId) return;
    
    setIsExporting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/export`);
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      // 获取文件名
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || "project.zip";
      
      // 下载文件
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
    } catch (err) {
      console.error("[ProjectPanel] Export failed:", err);
      toast.error("Failed to export project");
    } finally {
      setIsExporting(false);
    }
  };

  // 只有当面板关闭时才不渲染
  // projectId 为空时显示空状态，而不是完全隐藏
  if (!isOpen) return null;

  // 没有项目时显示空状态
  if (!projectId) {
    return (
      <div className="h-full w-full flex flex-col bg-black overflow-hidden relative">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Code2 className="size-5 text-zinc-400" />
            <h2 className="text-sm font-semibold text-white">Project</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={closePanel}
            className="h-7 w-7 p-0"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 px-6">
          <Code2 className="size-12 mb-4 text-zinc-600" />
          <p className="text-sm text-center mb-2">No project selected</p>
          <p className="text-xs text-center text-zinc-600">
            Create a new project or ask AI to build something for you
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-black overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Code2 className="size-5 text-zinc-400" />
            <h2 className="text-sm font-semibold text-white">Project</h2>
            {status === 'initializing' && (
              <Loader2 className="size-4 text-zinc-400 animate-spin" />
            )}
            {status === 'ready' && (
              <span className="text-xs text-green-400">● Ready</span>
            )}
            {status === 'error' && (
              <span className="text-xs text-red-400">● Error</span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('editor')}
                className={cn(
                  "h-7 px-2 text-xs",
                  viewMode === 'editor' && "bg-zinc-800 text-white"
                )}
              >
                <Code2 className="size-3.5 mr-1" />
                Code
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('preview')}
                className={cn(
                  "h-7 px-2 text-xs",
                  viewMode === 'preview' && "bg-zinc-800 text-white"
                )}
              >
                <Monitor className="size-3.5 mr-1" />
                Preview
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={closePanel}
              className="h-7 w-7 p-0"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-950">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleInstall}
            disabled={isInstalling || status !== 'ready'}
            className="h-7 px-2 text-xs"
          >
            {isInstalling ? (
              <Loader2 className="size-3.5 mr-1 animate-spin" />
            ) : (
              <Package className="size-3.5 mr-1" />
            )}
            Install
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBuild}
            disabled={isBuilding || status !== 'ready'}
            className="h-7 px-2 text-xs"
          >
            {isBuilding ? (
              <Loader2 className="size-3.5 mr-1 animate-spin" />
            ) : (
              <Hammer className="size-3.5 mr-1" />
            )}
            Build
          </Button>
          
          {isServerRunning ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStopServer}
              disabled={status !== 'ready'}
              className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
            >
              <Square className="size-3.5 mr-1" />
              Stop
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartServer}
              disabled={status !== 'ready'}
              className="h-7 px-2 text-xs text-green-400 hover:text-green-300"
            >
              <Play className="size-3.5 mr-1" />
              Run
            </Button>
          )}
          
          {/* 分隔线 */}
          <div className="h-4 w-px bg-zinc-700 mx-1" />
          
          {/* 导出按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || Object.keys(files).length === 0}
            className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300"
          >
            {isExporting ? (
              <Loader2 className="size-3.5 mr-1 animate-spin" />
            ) : (
              <Download className="size-3.5 mr-1" />
            )}
            Export
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="size-6 text-zinc-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-400 text-sm">
              {error.message}
            </div>
          ) : viewMode === 'editor' ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0">
                <ProjectEditor
                  files={files}
                  onFileChange={handleFileChange}
                />
              </div>
              {/* 保存按钮区域 */}
              {hasUnsavedChanges() && (
                <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
                  <span className="text-xs text-yellow-400">Unsaved changes</span>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveToDatabase}
                    disabled={isSaving}
                    className="h-7 px-3 text-xs bg-green-600 hover:bg-green-500"
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 mr-1 animate-spin" />
                    ) : (
                      <Save className="size-3.5 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              )}
              {/* 终端区域 */}
              <div className={cn(
                "border-t border-zinc-800 transition-all",
                terminalCollapsed ? "h-10" : "h-48"
              )}>
                <Terminal 
                  logs={logs} 
                  onClear={clearConsoleLogs}
                  collapsed={terminalCollapsed}
                  onToggleCollapse={() => setTerminalCollapsed(!terminalCollapsed)}
                />
              </div>
            </div>
          ) : (
            <WebView url={serverUrl} projectId={projectId} />
          )}
        </div>

        {/* Loading Indicator - 右下角 */}
        <AnimatePresence>
          {isGenerating && <ProjectLoading />}
        </AnimatePresence>
      </div>
  );
}
