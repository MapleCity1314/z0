"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  Image,
  FileType,
} from "lucide-react";

// 文件图标映射
function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, typeof File> = {
    ts: FileCode,
    tsx: FileCode,
    js: FileCode,
    jsx: FileCode,
    json: FileJson,
    md: FileText,
    txt: FileText,
    png: Image,
    jpg: Image,
    jpeg: Image,
    gif: Image,
    svg: Image,
    webp: Image,
  };
  return iconMap[ext] || FileType;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
}

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  selectedPath?: string;
  onSelect: (path: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}

function FileTreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  expandedFolders,
  onToggleFolder,
}: FileTreeItemProps) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedPath === node.path;
  const FileIcon = isFolder ? (isExpanded ? FolderOpen : Folder) : getFileIcon(node.name);

  const handleClick = () => {
    if (isFolder) {
      onToggleFolder(node.path);
    } else {
      onSelect(node.path);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer text-sm transition-colors",
          // Hover State
          "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
          // Selected State
          isSelected 
            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white" 
            : "text-zinc-600 dark:text-zinc-400"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isFolder && (
          <span className="flex-shrink-0 w-4">
            {isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </span>
        )}
        {!isFolder && <span className="w-4" />}
        <FileIcon
          className={cn(
            "size-4 flex-shrink-0",
            // Folder icon color
            isFolder 
              ? "text-yellow-500 dark:text-yellow-500" 
              : isSelected 
                ? "text-zinc-900 dark:text-zinc-300" 
                : "text-zinc-400 dark:text-zinc-500"
          )}
        />
        <span className="truncate">{node.name}</span>
      </div>
      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface FileTreeProps {
  files: Record<string, string>; // { "src/App.tsx": "content", ... }
  selectedPath?: string;
  onSelect: (path: string) => void;
  className?: string;
}

export function FileTree({ files, selectedPath, onSelect, className }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src", "components"]));

  // 将扁平文件结构转换为树形结构
  const tree = useMemo(() => {
    const root: FileNode[] = [];
    const paths = Object.keys(files).sort();

    for (const path of paths) {
      const parts = path.split("/");
      let currentLevel = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const currentPath = parts.slice(0, i + 1).join("/");
        const isFile = i === parts.length - 1;

        let existing = currentLevel.find((n) => n.name === part);

        if (!existing) {
          existing = {
            name: part,
            path: currentPath,
            type: isFile ? "file" : "folder",
            children: isFile ? undefined : [],
          };
          currentLevel.push(existing);
        }

        if (!isFile && existing.children) {
          currentLevel = existing.children;
        }
      }
    }

    // 排序：文件夹在前，文件在后，按名称排序
    const sortNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      }).map((node) => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined,
      }));
    };

    return sortNodes(root);
  }, [files]);

  const handleToggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className={cn("overflow-auto bg-white dark:bg-zinc-950", className)}>
      <div className="py-2">
        {tree.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            depth={0}
            selectedPath={selectedPath}
            onSelect={onSelect}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
          />
        ))}
      </div>
    </div>
  );
}