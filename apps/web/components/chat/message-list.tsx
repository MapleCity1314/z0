"use client";

import { cn } from "@/lib/utils";
import type { UIMessage, UIMessagePart } from "ai";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageAttachment,
  MessageAttachments,
} from "@/components/ai-elements/message";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { 
  Task, 
  TaskTrigger, 
  TaskContent, 
  TaskItem, 
  TaskItemFile,
} from "@/components/ai-elements/task";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Image } from "@/components/ai-elements/image";
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import { ArtifactActions, ArtifactAction } from "@/components/ai-elements/artifact";
import { PlayIcon, CopyIcon, RefreshCwIcon, CheckIcon, FolderOpen } from "lucide-react";
import { Loader2Icon } from "lucide-react";
import { MessageActions, MessageAction } from "@/components/ai-elements/message";
import { useState } from "react";
import { useExecutorStore } from "@/store/executor";
import { useProjectStore } from "@/store/project";
import type { BundledLanguage } from "shiki";
import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ai-elements/sources";
import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactContent } from "@/components/ai-elements/artifact";
import { Plan, PlanHeader, PlanTitle, PlanDescription, PlanContent, PlanTrigger } from "@/components/ai-elements/plan";
import { ChainOfThought, ChainOfThoughtHeader, ChainOfThoughtContent, ChainOfThoughtStep } from "@/components/ai-elements/chain-of-thought";
import { InlineCitation, InlineCitationText, InlineCitationCard, InlineCitationCardTrigger, InlineCitationCardBody, InlineCitationCarousel, InlineCitationCarouselContent, InlineCitationCarouselItem, InlineCitationSource } from "@/components/ai-elements/inline-citation";
import type { ComponentProps, ReactNode } from "react";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";

export type MessageListProps = ComponentProps<"div"> & {
  messages: UIMessage[];
  isStreaming?: boolean;
  showAssistantLoading?: boolean;
  onRetry?: (messageIndex: number) => void;
};

function AssistantLoadingIndicator({ optimistic = false }: { optimistic?: boolean }) {
  return (
    <Message from="assistant">
      <MessageContent>
        <div className="flex items-center gap-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">
          <Loader2Icon className="size-4 animate-spin" />
          <span>{optimistic ? "Thinking..." : "Generating response..."}</span>
        </div>
      </MessageContent>
    </Message>
  );
}

/**
 * Open Project Button - opens project panel when clicked
 */
function OpenProjectButton({ projectId }: { projectId: string }) {
  const setProjectId = useProjectStore((s) => s.setProjectId);
  
  const handleClick = () => {
    setProjectId(projectId);
  };
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
    >
      <FolderOpen className="size-3.5 mr-1" />
      Open Project
    </Button>
  );
}

/**
 * Code Artifact Renderer - renders executable code in an Artifact component
 */
function CodeArtifactRenderer({
  title,
  language,
  code,
  description,
  artifactIndex,
}: {
  title: string;
  language: string;
  code: string;
  description?: string;
  artifactIndex?: string;
}) {
  const { openPanel } = useExecutorStore();

  const handleExecute = () => {
    console.log("已触发 code executor");
    openPanel(code, language as BundledLanguage);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Artifact className="my-2">
        <ArtifactHeader>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {artifactIndex && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {artifactIndex}
                </span>
              )}
              <ArtifactTitle>{title}</ArtifactTitle>
            </div>
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </div>
          <ArtifactActions>
            <ArtifactAction
              icon={PlayIcon}
              tooltip="Run"
              onClick={handleExecute}
              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
            />
            <ArtifactAction
              icon={CopyIcon}
              tooltip="Copy"
              onClick={handleCopy}
            />
          </ArtifactActions>
        </ArtifactHeader>
        <ArtifactContent
          enableHighlight
          code={code}
          language={language as BundledLanguage}
        />
      </Artifact>
    </div>
  );
}

/**
 * 类型守卫：检查是否为工具类型
 */
function isToolPart(part: UIMessagePart<any, any>): part is UIMessagePart<any, any> & { type: `tool-${string}` } {
  return typeof part.type === "string" && part.type.startsWith("tool-");
}

/**
 * 类型守卫：检查是否为数据类型
 */
function isDataPart(part: UIMessagePart<any, any>): part is UIMessagePart<any, any> & { type: `data-${string}` } {
  return typeof part.type === "string" && part.type.startsWith("data-");
}

/**
 * 渲染单个 UIMessagePart
 */
function renderPart(part: UIMessagePart<any, any>, index: number): ReactNode {
  // 处理标准类型
  if (part.type === "text") {
    return <MessageResponse key={index}>{part.text}</MessageResponse>;
  }

  if (part.type === "file") {
    return (
      <MessageAttachments key={index}>
        <MessageAttachment data={part} />
      </MessageAttachments>
    );
  }

  if (part.type === "reasoning") {
    return (
      <div key={index} className="w-full max-w-3xl mx-auto">
        <Reasoning isStreaming={part.state === "streaming"}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text ?? ""}</ReasoningContent>
        </Reasoning>
      </div>
    );
  }

  if (part.type === "source-url") {
    return (
      <div key={index} className="w-full max-w-3xl mx-auto">
        <Sources>
          <SourcesTrigger count={1} />
          <SourcesContent>
            <Source href={part.url} title={part.title || part.url}>
              {part.title || part.url}
            </Source>
          </SourcesContent>
        </Sources>
      </div>
    );
  }

  if (part.type === "source-document") {
    return (
      <div key={index} className="w-full max-w-3xl mx-auto">
        <Sources>
          <SourcesTrigger count={1} />
          <SourcesContent>
            <Source href="#" title={part.title || "Document"}>
              {part.title || "Document"}
            </Source>
          </SourcesContent>
        </Sources>
      </div>
    );
  }

  // 处理工具类型 (tool-${NAME})
  if (isToolPart(part)) {
    const toolPart = part as any;
    const toolName = toolPart.toolName || toolPart.type.replace("tool-", "");

    // B. Artifact Tools - 直接渲染代码，不走 Task
    if ((toolName === "createArtifact" || toolName === "codeArtifact") && toolPart.output?.code) {
      const output = toolPart.output;
      return (
        <CodeArtifactRenderer
          key={index}
          title={output.title || "Untitled"}
          language={output.language || "text"}
          code={output.code}
          description={output.description}
          artifactIndex={output.index}
        />
      );
    }

    if (toolName === "updateArtifact" && toolPart.output?.code) {
      const output = toolPart.output;
      return (
        <CodeArtifactRenderer
          key={index}
          title={`${output.title || "Untitled"} (Updated)`}
          language={output.language || "text"}
          code={output.code}
          artifactIndex={output.index}
        />
      );
    }

    // readArtifact / listArtifacts - 使用 Tool 组件展示
    if (toolName === "readArtifact" || toolName === "listArtifacts") {
      return (
        <div key={index} className="w-full max-w-3xl mx-auto">
          <Tool defaultOpen={false}>
            <ToolHeader
              title={toolName}
              type={toolPart.type}
              state={toolPart.state}
            />
            <ToolContent>
              {toolPart.input && <ToolInput input={toolPart.input} />}
              <ToolOutput output={toolPart.output} errorText={toolPart.errorText} />
            </ToolContent>
          </Tool>
        </div>
      );
    }

    // 其他所有工具 - 使用 Task 组件展示执行过程
    const isCompleted = toolPart.state === "output-available";
    const isError = toolPart.state === "output-error";
    const isRunning = toolPart.state === "input-available" || toolPart.state === "input-streaming";
    
    // 生成任务标题和副标题
    const getTaskInfo = () => {
      const input = toolPart.input;
      const output = toolPart.output;
      
      const info: Record<string, { title: string; subtitle?: string }> = {
        // A. Web Tools
        tavilySearch: { 
          title: isRunning ? "Searching the web..." : "Web search completed",
          subtitle: input?.query ? `"${input.query}"` : undefined
        },
        tavilyExtract: { 
          title: isRunning ? "Extracting content..." : "Content extracted",
          subtitle: input?.urls?.length ? `${input.urls.length} URL(s)` : undefined
        },
        tavilyCrawl: { 
          title: isRunning ? "Crawling website..." : "Website crawled",
          subtitle: input?.url
        },
        tavilyMap: { 
          title: isRunning ? "Mapping site structure..." : "Site mapped",
          subtitle: input?.url
        },
        // C. Project File System
        readProjectFiles: { 
          title: isRunning ? "Reading project files..." : "Files loaded",
          subtitle: output?.files ? `${Object.keys(output.files).length} files` : undefined
        },
        getProjectFile: { 
          title: isRunning ? "Reading file..." : "File loaded",
          subtitle: input?.filePath
        },
        existsProjectFile: { 
          title: isRunning ? "Checking file..." : output?.exists ? "File exists" : "File not found",
          subtitle: input?.filePath
        },
        createProjectFile: { 
          title: isRunning ? "Creating file..." : "File created",
          subtitle: input?.filePath
        },
        updateProjectFile: { 
          title: isRunning ? "Updating file..." : "File updated",
          subtitle: input?.filePath
        },
        patchProjectFile: { 
          title: isRunning ? "Patching file..." : "File patched",
          subtitle: input?.filePath
        },
        deleteProjectFile: { 
          title: isRunning ? "Deleting file..." : "File deleted",
          subtitle: input?.filePath
        },
        getProjectInfo: { 
          title: isRunning ? "Loading project info..." : "Project info loaded"
        },
        updateProjectInfo: { 
          title: isRunning ? "Updating project..." : "Project updated"
        },
        createProject: { 
          title: isRunning ? "Creating new project..." : "Project created",
          subtitle: input?.name || output?.name
        },
        listProjects: { 
          title: isRunning ? "Loading projects..." : "Projects loaded",
          subtitle: output?.projects ? `${output.projects.length} projects` : undefined
        },
        // D. Build & Dependency
        addDependency: { 
          title: isRunning ? "Installing packages..." : "Packages installed",
          subtitle: input?.packages?.join(", ")
        },
        removeDependency: { 
          title: isRunning ? "Removing packages..." : "Packages removed",
          subtitle: input?.packages?.join(", ")
        },
        installDependencies: { 
          title: isRunning ? "Installing dependencies..." : "Dependencies installed"
        },
        runBuild: { 
          title: isRunning ? "Building project..." : "Build completed",
          subtitle: input?.mode || "production"
        },
        runLint: { 
          title: isRunning ? "Running linter..." : "Lint completed"
        },
        runFormat: { 
          title: isRunning ? "Formatting code..." : "Code formatted"
        },
        runScript: { 
          title: isRunning ? "Running script..." : "Script completed",
          subtitle: input?.script
        },
        // E. Runtime & Preview
        startDevServer: { 
          title: isRunning ? "Starting dev server..." : "Dev server running",
          subtitle: output?.url || (input?.port ? `Port ${input.port}` : undefined)
        },
        startPreviewServer: { 
          title: isRunning ? "Starting preview..." : "Preview ready",
          subtitle: output?.url
        },
        stopServer: { 
          title: isRunning ? "Stopping server..." : "Server stopped"
        },
        proxyRequestToDevServer: { 
          title: isRunning ? "Proxying request..." : "Request completed",
          subtitle: input?.path
        },
        getServerStatus: { 
          title: isRunning ? "Checking server..." : output?.running ? "Server running" : "Server stopped"
        },
        // F. DOM & Interaction
        inspectDOM: { 
          title: isRunning ? "Inspecting DOM..." : "DOM inspected"
        },
        queryElement: { 
          title: isRunning ? "Querying element..." : "Element found",
          subtitle: input?.selector
        },
        queryElements: { 
          title: isRunning ? "Querying elements..." : `Found ${output?.elements?.length || 0} elements`,
          subtitle: input?.selector
        },
        captureScreenshot: { 
          title: isRunning ? "Capturing screenshot..." : "Screenshot captured"
        },
        captureElementScreenshot: { 
          title: isRunning ? "Capturing element..." : "Element captured",
          subtitle: input?.selector
        },
        evaluateClientScript: { 
          title: isRunning ? "Evaluating script..." : "Script executed"
        },
        readClientState: { 
          title: isRunning ? "Reading state..." : "State loaded"
        },
        // G. Observability
        getConsoleLogs: { 
          title: isRunning ? "Getting logs..." : "Logs retrieved",
          subtitle: output?.logs ? `${output.logs.length} entries` : undefined
        },
        clearConsoleLogs: { 
          title: isRunning ? "Clearing logs..." : "Logs cleared"
        },
        getNetworkRequests: { 
          title: isRunning ? "Getting requests..." : "Requests retrieved",
          subtitle: output?.requests ? `${output.requests.length} requests` : undefined
        },
        clearNetworkRequests: { 
          title: isRunning ? "Clearing requests..." : "Requests cleared"
        },
        getPerformanceMetrics: { 
          title: isRunning ? "Getting metrics..." : "Metrics retrieved"
        },
        // H. Diff / Patch / AST
        generateDiff: { 
          title: isRunning ? "Generating diff..." : "Diff generated"
        },
        applyDiff: { 
          title: isRunning ? "Applying changes..." : "Changes applied",
          subtitle: input?.filePath
        },
        generateASTPatch: { 
          title: isRunning ? "Generating AST patch..." : "AST patch generated",
          subtitle: input?.filePath
        },
        // J. System & Security
        runSandboxedScript: { 
          title: isRunning ? "Running in sandbox..." : "Script completed"
        },
        getQuotaUsage: { 
          title: isRunning ? "Checking quota..." : "Quota retrieved"
        },
        terminateTask: { 
          title: isRunning ? "Terminating..." : "Task terminated"
        },
        logEvent: { 
          title: isRunning ? "Logging event..." : "Event logged"
        },
        // File Package Tools
        saveFile: { 
          title: isRunning ? "Saving file..." : "File saved",
          subtitle: input?.filename
        },
        saveMultipleFiles: { 
          title: isRunning ? "Saving files..." : "Files saved",
          subtitle: input?.files ? `${input.files.length} files` : undefined
        },
        createZip: { 
          title: isRunning ? "Creating archive..." : "Archive created",
          subtitle: output?.filename
        },
        listPackages: { 
          title: isRunning ? "Listing packages..." : "Packages listed"
        },
      };
      
      return info[toolName] || { title: isRunning ? `Running ${toolName}...` : `${toolName} completed` };
    };

    // 渲染任务项内容 - 更详细的输出
    const renderTaskItems = () => {
      const items: React.ReactNode[] = [];
      const input = toolPart.input;
      const output = toolPart.output;

      // Web 搜索工具
      if (toolName === "tavilySearch") {
        if (input?.query) {
          items.push(
            <TaskItem key="query">
              Query: <span className="text-foreground font-medium">"{input.query}"</span>
            </TaskItem>
          );
        }
        if (output?.results?.length) {
          items.push(
            <TaskItem key="results">
              Found {output.results.length} results
            </TaskItem>
          );
          // 显示前3个结果
          output.results.slice(0, 3).forEach((result: any, i: number) => {
            items.push(
              <TaskItem key={`result-${i}`}>
                <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  {result.title || result.url}
                </a>
              </TaskItem>
            );
          });
          if (output.results.length > 3) {
            items.push(
              <TaskItem key="more" className="text-zinc-500">
                +{output.results.length - 3} more results
              </TaskItem>
            );
          }
        }
      }
      
      // 网页提取工具
      else if (toolName === "tavilyExtract" && input?.urls) {
        input.urls.forEach((url: string, i: number) => {
          items.push(
            <TaskItem key={`url-${i}`}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                {url}
              </a>
            </TaskItem>
          );
        });
      }
      
      // 网站爬取/映射
      else if ((toolName === "tavilyCrawl" || toolName === "tavilyMap") && input?.url) {
        items.push(
          <TaskItem key="url">
            <a href={input.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {input.url}
            </a>
          </TaskItem>
        );
        if (output?.pages) {
          items.push(
            <TaskItem key="pages">
              Discovered {output.pages.length} pages
            </TaskItem>
          );
        }
      }
      
      // 文件操作工具
      else if (["createProjectFile", "updateProjectFile", "patchProjectFile", "deleteProjectFile", "getProjectFile"].includes(toolName)) {
        if (input?.filePath) {
          items.push(
            <TaskItem key="file">
              <TaskItemFile>{input.filePath}</TaskItemFile>
            </TaskItem>
          );
        }
      }
      
      // 读取多个文件
      else if (toolName === "readProjectFiles" && output?.files) {
        const fileNames = Object.keys(output.files);
        items.push(
          <TaskItem key="count">
            Loaded {fileNames.length} files
          </TaskItem>
        );
        fileNames.slice(0, 5).forEach((name, i) => {
          items.push(
            <TaskItem key={`file-${i}`}>
              <TaskItemFile>{name}</TaskItemFile>
            </TaskItem>
          );
        });
        if (fileNames.length > 5) {
          items.push(
            <TaskItem key="more" className="text-zinc-500">
              +{fileNames.length - 5} more files
            </TaskItem>
          );
        }
      }
      
      // 创建项目
      else if (toolName === "createProject") {
        if (input?.name) {
          items.push(
            <TaskItem key="name">
              Project: <span className="text-foreground font-medium">{input.name}</span>
            </TaskItem>
          );
        }
        if (input?.template) {
          items.push(
            <TaskItem key="template">
              Template: {input.template}
            </TaskItem>
          );
        }
        if (isCompleted && output?.projectId) {
          items.push(
            <TaskItem key="open-project">
              <OpenProjectButton projectId={output.projectId} />
            </TaskItem>
          );
        }
      }
      
      // 依赖管理
      else if (["addDependency", "removeDependency"].includes(toolName) && input?.packages) {
        items.push(
          <TaskItem key="packages">
            {input.packages.map((pkg: string, i: number) => (
              <span key={i} className="inline-flex items-center gap-1 mr-2">
                <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded text-xs font-mono">{pkg}</span>
              </span>
            ))}
          </TaskItem>
        );
      }
      
      // 安装依赖
      else if (toolName === "installDependencies") {
        if (isRunning) {
          items.push(
            <TaskItem key="progress">
              Installing packages from package.json...
            </TaskItem>
          );
        }
        if (isCompleted) {
          items.push(
            <TaskItem key="done">
              All dependencies installed successfully
            </TaskItem>
          );
        }
      }
      
      // 构建
      else if (toolName === "runBuild") {
        if (input?.mode) {
          items.push(
            <TaskItem key="mode">
              Mode: <span className="text-yellow-400">{input.mode}</span>
            </TaskItem>
          );
        }
        if (isCompleted && output?.duration) {
          items.push(
            <TaskItem key="duration">
              Completed in {output.duration}ms
            </TaskItem>
          );
        }
      }
      
      // 开发服务器
      else if (toolName === "startDevServer" || toolName === "startPreviewServer") {
        if (input?.port) {
          items.push(
            <TaskItem key="port">
              Port: {input.port}
            </TaskItem>
          );
        }
        if (isCompleted && output?.url) {
          items.push(
            <TaskItem key="url">
              <a href={output.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                {output.url}
              </a>
            </TaskItem>
          );
        }
      }
      
      // 截图
      else if (toolName === "captureScreenshot" || toolName === "captureElementScreenshot") {
        if (input?.selector) {
          items.push(
            <TaskItem key="selector">
              Selector: <code className="px-1 py-0.5 bg-zinc-800 rounded text-xs">{input.selector}</code>
            </TaskItem>
          );
        }
        if (isCompleted && output?.dataUrl) {
          items.push(
            <TaskItem key="preview">
              <img 
                src={output.dataUrl} 
                alt="Screenshot" 
                className="max-w-full h-auto rounded border border-zinc-700 mt-2"
                style={{ maxHeight: 200 }}
              />
            </TaskItem>
          );
        }
      }
      
      // 下载链接
      else if (isCompleted && output?.downloadUrl) {
        items.push(
          <TaskItem key="download">
            <a href={output.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Download {output.filename || "file"}
            </a>
          </TaskItem>
        );
      }
      
      // 通用文件路径
      else if (input?.filePath || input?.path) {
        items.push(
          <TaskItem key="file">
            <TaskItemFile>{input.filePath || input.path}</TaskItemFile>
          </TaskItem>
        );
      }

      // 显示错误信息
      if (isError && toolPart.errorText) {
        items.push(
          <TaskItem key="error" className="text-red-400">
            {toolPart.errorText}
          </TaskItem>
        );
      }

      // 显示通用成功消息
      if (isCompleted && output?.message && items.length === 0) {
        items.push(
          <TaskItem key="message" className={output.success === false ? "text-red-400" : ""}>
            {output.message}
          </TaskItem>
        );
      }

      return items.length > 0 ? items : null;
    };

    // 确定 Task 状态：映射到 TaskTrigger 的 status
    const taskStatus = isRunning ? "running" : isError ? "error" : "success";
    const taskInfo = getTaskInfo();

    return (
      <div key={index} className="w-full max-w-3xl mx-auto my-2">
        <Task defaultOpen={isRunning || isError}>
          <TaskTrigger 
            title={taskInfo.subtitle ? `${taskInfo.title} - ${taskInfo.subtitle}` : taskInfo.title}
            status={taskStatus}
            toolName={toolName}
          />
          <TaskContent>
            {renderTaskItems()}
          </TaskContent>
        </Task>
      </div>
    );
  }

  // 处理数据类型 (data-${NAME}) 和自定义类型
  if (isDataPart(part)) {
    const dataPart = part as any;
    const dataType = dataPart.type.replace("data-", "");

    // 根据数据类型名称渲染不同的组件
    switch (dataType) {
      case "image": {
        return (
          <div key={index} className="w-full max-w-3xl mx-auto my-2">
            <Image
              base64={dataPart.base64}
              uint8Array={dataPart.uint8Array}
              mediaType={dataPart.mediaType}
              alt={dataPart.alt || "Generated image"}
            />
          </div>
        );
      }

      case "artifact": {
        return (
          <div key={index} className="w-full max-w-3xl mx-auto">
            <Artifact>
              <ArtifactHeader>
                <ArtifactTitle>{dataPart.title || "Artifact"}</ArtifactTitle>
              </ArtifactHeader>
              <ArtifactContent>
                {typeof dataPart.content === "string" ? (
                  <MessageResponse>{dataPart.content}</MessageResponse>
                ) : (
                  dataPart.content
                )}
              </ArtifactContent>
            </Artifact>
          </div>
        );
      }

      case "plan": {
        return (
          <div key={index} className="w-full max-w-3xl mx-auto">
            <Plan isStreaming={false}>
              <PlanHeader>
                <PlanTitle>{dataPart.title || "Plan"}</PlanTitle>
                <PlanTrigger />
              </PlanHeader>
              {dataPart.description && (
                <PlanDescription>{dataPart.description}</PlanDescription>
              )}
              <PlanContent>
                {typeof dataPart.content === "string" ? (
                  <MessageResponse>{dataPart.content}</MessageResponse>
                ) : (
                  dataPart.content
                )}
              </PlanContent>
            </Plan>
          </div>
        );
      }

      case "chain-of-thought": {
        return (
          <div key={index} className="w-full max-w-3xl mx-auto">
            <ChainOfThought>
              <ChainOfThoughtHeader>
                {dataPart.title || "Chain of Thought"}
              </ChainOfThoughtHeader>
              <ChainOfThoughtContent>
                {dataPart.steps?.map((step: any, stepIndex: number) => (
                  <ChainOfThoughtStep
                    key={stepIndex}
                    label={step.label}
                    description={step.description}
                    status={step.status || "complete"}
                  >
                    {step.content}
                  </ChainOfThoughtStep>
                ))}
              </ChainOfThoughtContent>
            </ChainOfThought>
          </div>
        );
      }

      case "inline-citation": {
        return (
          <InlineCitation key={index}>
            <InlineCitationText>{dataPart.text}</InlineCitationText>
            {dataPart.sources && dataPart.sources.length > 0 && (
              <InlineCitationCard>
                <InlineCitationCardTrigger sources={dataPart.sources} />
                <InlineCitationCardBody>
                  <InlineCitationCarousel>
                    <InlineCitationCarouselContent>
                      {dataPart.sources.map((source: string, sourceIndex: number) => (
                        <InlineCitationCarouselItem key={sourceIndex}>
                          <InlineCitationSource url={source} />
                        </InlineCitationCarouselItem>
                      ))}
                    </InlineCitationCarouselContent>
                  </InlineCitationCarousel>
                </InlineCitationCardBody>
              </InlineCitationCard>
            )}
          </InlineCitation>
        );
      }

      default: {
        // 未知数据类型，尝试渲染为代码块
        const dataStr = typeof dataPart.data === "string" 
          ? dataPart.data 
          : JSON.stringify(dataPart.data, null, 2);
        
        return (
          <div key={index} className="w-full max-w-3xl mx-auto">
            <CodeBlock code={dataStr} language="json">
              <CodeBlockCopyButton />
            </CodeBlock>
          </div>
        );
      }
    }
  }

  // 处理 step-start 类型（通常不需要渲染）
  if (part.type === "step-start") {
    return null;
  }

  // 未知类型，尝试渲染为 JSON
  return (
    <div key={index} className="w-full max-w-3xl mx-auto">
      <CodeBlock code={JSON.stringify(part, null, 2)} language="json">
        <CodeBlockCopyButton />
      </CodeBlock>
    </div>
  );
}

/**
 * 消息操作按钮组件
 */
function MessageActionButtons({
  message,
  onRetry,
  isStreaming,
  isUser = false,
}: {
  message: UIMessage;
  onRetry?: () => void;
  isStreaming?: boolean;
  isUser?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  // 提取所有文本内容用于复制
  const getTextContent = () => {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getTextContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // 流式传输中不显示操作按钮
  if (isStreaming) return null;

  return (
    <MessageActions className={cn(
      "opacity-0 group-hover:opacity-100 transition-opacity mt-1",
      isUser && "ml-auto"
    )}>
      <MessageAction
        tooltip={copied ? "Copied!" : "Copy"}
        onClick={handleCopy}
        className="text-zinc-500 hover:text-zinc-300"
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </MessageAction>
      {onRetry && (
        <MessageAction
          tooltip="Retry"
          onClick={onRetry}
          className="text-zinc-500 hover:text-zinc-300"
        >
          <RefreshCwIcon className="size-3.5" />
        </MessageAction>
      )}
    </MessageActions>
  );
}

/**
 * 渲染单个 UIMessage
 */
function renderMessage(
  message: UIMessage,
  index: number,
  isStreaming: boolean,
  onRetry?: (messageIndex: number) => void
): ReactNode {
  const { role, parts = [] } = message;

  // 用户消息：使用纯文本渲染，避免 markdown 注入风险
  if (role === "user") {
    const textParts = parts.filter((p) => p.type === "text");
    const fileParts = parts.filter((p) => p.type === "file");

    return (
      <Message key={index} from={role}>
        <MessageContent>
          {fileParts.length > 0 && (
            <MessageAttachments>
              {fileParts.map((part, partIndex) => (
                <MessageAttachment key={partIndex} data={part} />
              ))}
            </MessageAttachments>
          )}
          {textParts.map((part, partIndex) => (
            <p key={partIndex} className="whitespace-pre-wrap break-words">
              {part.text}
            </p>
          ))}
        </MessageContent>
        <MessageActionButtons
          message={message}
          isStreaming={isStreaming}
          isUser
        />
      </Message>
    );
  }

  // Assistant 消息可能包含多种类型的内容
  return (
    <Message key={index} from={role}>
      <MessageContent>
        {parts.map((part, partIndex) => renderPart(part, partIndex))}
      </MessageContent>
      <MessageActionButtons
        message={message}
        onRetry={onRetry ? () => onRetry(index) : undefined}
        isStreaming={isStreaming}
      />
    </Message>
  );
}

/**
 * 终极版消息列表组件
 * 能够渲染 AI SDK 中 UIMessage 的所有类型
 */
export function MessageList({
  messages,
  isStreaming = false,
  showAssistantLoading = false,
  onRetry,
  className,
  ...props
}: MessageListProps) {
  if (!messages || messages.length === 0) {
    return null;
  }

  const lastAssistantIndex = messages.reduce((lastIndex, message, index) => {
    return message.role === "assistant" ? index : lastIndex;
  }, -1);
  const lastUserIndex = messages.reduce((lastIndex, message, index) => {
    return message.role === "user" ? index : lastIndex;
  }, -1);
  const hasAssistantForCurrentTurn = lastAssistantIndex > lastUserIndex;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {messages.map((message, index) => {
        const isLastMessage = index === messages.length - 1;
        const messageIsStreaming = isStreaming && isLastMessage;
        const showLoadingAfterThisMessage =
          showAssistantLoading &&
          hasAssistantForCurrentTurn &&
          index === lastAssistantIndex;
        
        return (
          <Fragment key={message.id || index}>
            {renderMessage(message, index, messageIsStreaming, onRetry)}
            {showLoadingAfterThisMessage && <AssistantLoadingIndicator />}
          </Fragment>
        );
      })}
      {showAssistantLoading && !hasAssistantForCurrentTurn && (
        <AssistantLoadingIndicator optimistic />
      )}
    </div>
  );
}

