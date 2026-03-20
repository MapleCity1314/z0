"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FileTree } from "./file-tree";
import { CodeEditor, getLanguageFromFilename } from "./code-editor";
import { X, Save, RotateCcw } from "lucide-react";
import { Button } from "@z0/ui/button";

export interface ProjectEditorProps {
  files: Record<string, string>;
  onFilesChange?: (files: Record<string, string>) => void;
  onFileChange?: (path: string, content: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function ProjectEditor({
  files,
  onFilesChange,
  onFileChange,
  readOnly = false,
  className,
}: ProjectEditorProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [modifiedFiles, setModifiedFiles] = useState<Record<string, string>>({});
  const [openTabs, setOpenTabs] = useState<string[]>([]);

  // 获取当前文件内容（优先使用修改后的内容）
  const getFileContent = useCallback(
    (path: string) => {
      return modifiedFiles[path] ?? files[path] ?? "";
    },
    [files, modifiedFiles]
  );

  // 选择文件
  const handleSelectFile = useCallback((path: string) => {
    setSelectedPath(path);
    setOpenTabs((prev) => {
      if (!prev.includes(path)) {
        return [...prev, path];
      }
      return prev;
    });
  }, []);

  // 关闭标签页
  const handleCloseTab = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs((prev) => prev.filter((p) => p !== path));
    if (selectedPath === path) {
      const remaining = openTabs.filter((p) => p !== path);
      setSelectedPath(remaining.length > 0 ? remaining[remaining.length - 1] : null);
    }
  }, [selectedPath, openTabs]);

  // 文件内容变更
  const handleContentChange = useCallback(
    (content: string) => {
      if (!selectedPath || readOnly) return;
      setModifiedFiles((prev) => ({
        ...prev,
        [selectedPath]: content,
      }));
      
      // 如果提供了 onFileChange，立即同步单个文件
      if (onFileChange) {
        onFileChange(selectedPath, content);
      }
    },
    [selectedPath, readOnly, onFileChange]
  );

  // 保存所有修改
  const handleSaveAll = useCallback(() => {
    if (readOnly || Object.keys(modifiedFiles).length === 0) return;
    const newFiles = { ...files, ...modifiedFiles };
    onFilesChange?.(newFiles);
    setModifiedFiles({});
  }, [files, modifiedFiles, onFilesChange, readOnly]);

  // 重置修改
  const handleReset = useCallback(() => {
    setModifiedFiles({});
  }, []);

  // 检查文件是否被修改
  const isFileModified = useCallback(
    (path: string) => {
      return path in modifiedFiles && modifiedFiles[path] !== files[path];
    },
    [files, modifiedFiles]
  );

  const hasModifications = Object.keys(modifiedFiles).some(
    (path) => modifiedFiles[path] !== files[path]
  );

  return (
    <div className={cn(
      "flex h-full rounded-lg overflow-hidden border",
      "bg-white border-zinc-200", // Light
      "dark:bg-zinc-950 dark:border-zinc-800", // Dark
      className
    )}>
      {/* 文件树侧边栏 */}
      <div className={cn(
        "w-56 shrink-0 border-r flex flex-col",
        "border-zinc-200", // Light
        "dark:border-zinc-800" // Dark
      )}>
        <div className={cn(
          "px-3 py-2 border-b flex items-center justify-between",
          "border-zinc-200", // Light
          "dark:border-zinc-800" // Dark
        )}>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Files
          </span>
          {hasModifications && !readOnly && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                onClick={handleReset}
                title="Reset changes"
              >
                <RotateCcw className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                onClick={handleSaveAll}
                title="Save all"
              >
                <Save className="size-3" />
              </Button>
            </div>
          )}
        </div>
        <FileTree
          files={files}
          selectedPath={selectedPath || undefined}
          onSelect={handleSelectFile}
          className="flex-1"
        />
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 标签栏 */}
        {openTabs.length > 0 && (
          <div className={cn(
            "flex items-center border-b overflow-x-auto",
            "bg-zinc-50 border-zinc-200", // Light
            "dark:bg-zinc-900/50 dark:border-zinc-800" // Dark
          )}>
            {openTabs.map((path) => {
              const filename = path.split("/").pop() || path;
              const isActive = selectedPath === path;
              const isModified = isFileModified(path);

              return (
                <div
                  key={path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-r transition-colors",
                    "border-zinc-200 dark:border-zinc-800",
                    isActive
                      ? "bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50"
                  )}
                  onClick={() => setSelectedPath(path)}
                >
                  <span className="truncate max-w-[120px]">{filename}</span>
                  {isModified && (
                    <span className="size-2 rounded-full bg-yellow-500" />
                  )}
                  <button
                    className={cn(
                      "p-0.5 rounded",
                      "hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700", // Light
                      "dark:hover:bg-zinc-700 dark:text-zinc-500 dark:hover:text-white" // Dark
                    )}
                    onClick={(e) => handleCloseTab(path, e)}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* 编辑器 */}
        <div className="flex-1 min-h-0">
          {selectedPath ? (
            <CodeEditor
              value={getFileContent(selectedPath)}
              onChange={handleContentChange}
              language={getLanguageFromFilename(selectedPath)}
              readOnly={readOnly}
              height="100%"
              className="h-full border-0 rounded-none"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
              <div className="text-center">
                <p className="text-sm">Select a file to edit</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-600 mt-1">
                  Click on a file in the sidebar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
