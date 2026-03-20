"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@z0/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  ChevronRightIcon,
  Loader2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  CircleIcon,
  SearchIcon,
  GlobeIcon,
  FileIcon,
  PackageIcon,
  PlayIcon,
  CodeIcon,
  TerminalIcon,
  WrenchIcon,
  FolderIcon,
  FileTextIcon,
  FilePlusIcon,
  FileEditIcon,
  FileMinusIcon,
  DownloadIcon,
  UploadIcon,
  ServerIcon,
  EyeIcon,
  CameraIcon,
  ActivityIcon,
  NetworkIcon,
  GitBranchIcon,
  ZapIcon,
  ShieldIcon,
  SparklesIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

// ------------------------------------------------------------------
// 1. Tool Icons Mapping (保留你的自定义图标逻辑)
// ------------------------------------------------------------------
// 优化了颜色：在亮色模式下深一点，暗色模式下亮一点，避免刺眼
const toolIcons: Record<string, { icon: ReactNode; color: string }> = {
  // A. Web Tools
  tavilySearch: { icon: <SearchIcon className="size-4" />, color: "text-purple-600 dark:text-purple-400" },
  tavilyExtract: { icon: <DownloadIcon className="size-4" />, color: "text-purple-600 dark:text-purple-400" },
  tavilyCrawl: { icon: <GlobeIcon className="size-4" />, color: "text-purple-600 dark:text-purple-400" },
  tavilyMap: { icon: <NetworkIcon className="size-4" />, color: "text-purple-600 dark:text-purple-400" },
  // C. Project File System
  readProjectFiles: { icon: <FolderIcon className="size-4" />, color: "text-blue-600 dark:text-blue-400" },
  getProjectFile: { icon: <FileTextIcon className="size-4" />, color: "text-blue-600 dark:text-blue-400" },
  existsProjectFile: { icon: <EyeIcon className="size-4" />, color: "text-blue-600 dark:text-blue-400" },
  createProjectFile: { icon: <FilePlusIcon className="size-4" />, color: "text-emerald-600 dark:text-emerald-400" },
  updateProjectFile: { icon: <FileEditIcon className="size-4" />, color: "text-amber-600 dark:text-amber-400" },
  patchProjectFile: { icon: <GitBranchIcon className="size-4" />, color: "text-amber-600 dark:text-amber-400" },
  deleteProjectFile: { icon: <FileMinusIcon className="size-4" />, color: "text-red-600 dark:text-red-400" },
  getProjectInfo: { icon: <FileIcon className="size-4" />, color: "text-blue-600 dark:text-blue-400" },
  createProject: { icon: <SparklesIcon className="size-4" />, color: "text-emerald-600 dark:text-emerald-400" },
  listProjects: { icon: <FolderIcon className="size-4" />, color: "text-blue-600 dark:text-blue-400" },
  // D. Build & Dependency
  addDependency: { icon: <PackageIcon className="size-4" />, color: "text-orange-600 dark:text-orange-400" },
  removeDependency: { icon: <PackageIcon className="size-4" />, color: "text-red-600 dark:text-red-400" },
  installDependencies: { icon: <DownloadIcon className="size-4" />, color: "text-orange-600 dark:text-orange-400" },
  runBuild: { icon: <ZapIcon className="size-4" />, color: "text-amber-600 dark:text-amber-400" },
  runLint: { icon: <ShieldIcon className="size-4" />, color: "text-cyan-600 dark:text-cyan-400" },
  runFormat: { icon: <CodeIcon className="size-4" />, color: "text-cyan-600 dark:text-cyan-400" },
  runScript: { icon: <TerminalIcon className="size-4" />, color: "text-emerald-600 dark:text-emerald-400" },
  // E. Runtime & Preview
  startDevServer: { icon: <PlayIcon className="size-4" />, color: "text-emerald-600 dark:text-emerald-400" },
  startPreviewServer: { icon: <PlayIcon className="size-4" />, color: "text-emerald-600 dark:text-emerald-400" },
  stopServer: { icon: <ServerIcon className="size-4" />, color: "text-red-600 dark:text-red-400" },
  // F. DOM & Interaction
  inspectDOM: { icon: <CodeIcon className="size-4" />, color: "text-cyan-600 dark:text-cyan-400" },
  captureScreenshot: { icon: <CameraIcon className="size-4" />, color: "text-pink-600 dark:text-pink-400" },
  // G. Observability
  getConsoleLogs: { icon: <TerminalIcon className="size-4" />, color: "text-zinc-500" },
  // Default
  default: { icon: <WrenchIcon className="size-4" />, color: "text-zinc-500" },
};

export function getToolIcon(toolName: string) {
  return toolIcons[toolName] || toolIcons.default;
}


// ------------------------------------------------------------------
// 2. Task Container
// ------------------------------------------------------------------
export type TaskProps = ComponentProps<typeof Collapsible> & {
  defaultOpen?: boolean;
};

export const Task = ({
  defaultOpen = false,
  className,
  ...props
}: TaskProps) => (
  <Collapsible
    className={cn("w-full group/task block", className)}
    defaultOpen={defaultOpen}
    {...props}
  />
);

// ------------------------------------------------------------------
// 3. Task Trigger (Header) - 核心修改部分
// ------------------------------------------------------------------
export type TaskTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  title: string;
  toolName?: string;     // 传入工具名以获取自定义图标
  icon?: ReactNode;      // 直接传入图标
  status?: "pending" | "running" | "success" | "error" | "canceled";
  time?: string;
};

export const TaskTrigger = ({
  children,
  className,
  title,
  toolName,
  icon,
  status = "pending",
  time,
  ...props
}: TaskTriggerProps) => {
  
  // 渲染图标逻辑：
  // 1. 如果正在加载，显示 Spinner
  // 2. 如果出错，显示红色警告
  // 3. 如果有传入 icon，显示 icon
  // 4. 如果有 toolName，显示映射的工具图标
  // 5. 否则显示默认状态图标
  const renderIcon = () => {
    if (status === "running" || status === "pending") { // 注意：有些库pending代表未开始，running代表进行中，需根据实际调整
        if (status === "running") return <Loader2Icon className="size-4 animate-spin text-blue-500" />;
        // 如果是 pending 但还没 run，可以用空圆圈或特定图标
    }
    
    if (status === "error") {
      return <AlertCircleIcon className="size-4 text-red-500" />;
    }

    // 自定义传入的 icon
    if (icon) return icon;

    // 工具图标
    if (toolName) {
      const tool = getToolIcon(toolName);
      return <div className={cn(tool.color)}>{tool.icon}</div>;
    }

    // 默认完成状态
    if (status === "success") {
      return <CheckCircle2Icon className="size-4 text-muted-foreground/60" />;
    }

    return <CircleIcon className="size-4 text-muted-foreground/30" />;
  };

  return (
    <CollapsibleTrigger 
      asChild 
      className={cn(
        "group/trigger flex w-full items-center gap-3 py-2 text-left cursor-pointer transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 rounded-md px-1", 
        className
      )} 
      {...props}
    >
      <div className="flex flex-1 items-center gap-3 overflow-hidden">
        {/* 图标容器：固定宽度保证对齐 */}
        <div className="flex items-center justify-center size-5 shrink-0">
          {renderIcon()}
        </div>

        {/* 标题 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className={cn(
                "text-sm font-medium truncate transition-colors",
                status === "error" ? "text-red-600 dark:text-red-400" : "text-foreground"
            )}>
              {title}
            </span>
        </div>

        {/* 右侧：时间 + 展开箭头 */}
        <div className="flex items-center gap-2 text-muted-foreground shrink-0">
          {time && <span className="text-xs font-mono opacity-0 group-hover/trigger:opacity-100 transition-opacity">{time}</span>}
          <ChevronRightIcon className="size-4 transition-transform duration-200 group-data-[state=open]/task:rotate-90" />
        </div>
      </div>
    </CollapsibleTrigger>
  );
};

// ------------------------------------------------------------------
// 4. Task Content (Body) - 时间轴风格
// ------------------------------------------------------------------
export type TaskContentProps = ComponentProps<typeof CollapsibleContent>;

export const TaskContent = ({
  children,
  className,
  ...props
}: TaskContentProps) => (
  <CollapsibleContent
    className={cn(
      "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className
    )}
    {...props}
  >
    {/* 
       padding-left 调整：让竖线正好对齐 Header 图标的中心 
       图标容器宽 size-5 (20px) + gap-3 (12px) + padding-left (4px)
       竖线应该位于中心，视觉调整后 ml-[1.15rem] 左右效果较好
    */}
    <div className="ml-[0.85rem] border-l border-border/60 pl-6 pb-2 pt-1 space-y-2">
      {children}
    </div>
  </CollapsibleContent>
);

// ------------------------------------------------------------------
// 5. Task Item (List Items)
// ------------------------------------------------------------------
export type TaskItemProps = ComponentProps<"div">;

export const TaskItem = ({ children, className, ...props }: TaskItemProps) => (
  <div 
    className={cn(
      "text-sm text-muted-foreground/80 leading-snug font-normal hover:text-foreground transition-colors", 
      className
    )} 
    {...props}
  >
    {children}
  </div>
);

// ------------------------------------------------------------------
// 6. Task File (File Badge) - IDE 风格
// ------------------------------------------------------------------
export type TaskItemFileProps = ComponentProps<"div">;

export const TaskItemFile = ({
  children,
  className,
  ...props
}: TaskItemFileProps) => (
  <div
    className={cn(
      "inline-flex items-center gap-1.5 rounded-sm border border-border/60 bg-muted/40 px-1.5 py-0.5 text-xs font-mono text-foreground/90 transition-colors hover:bg-muted hover:border-border/80 align-middle ml-1",
      className
    )}
    {...props}
  >
    <FileIcon className="size-3 opacity-60" />
    {children}
  </div>
);
