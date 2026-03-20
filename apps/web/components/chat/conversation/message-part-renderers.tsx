"use client";

import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  CodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { Image } from "@/components/ai-elements/image";
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationSource,
  InlineCitationText,
} from "@/components/ai-elements/inline-citation";
import {
  MessageAttachment,
  MessageAttachments,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Plan,
  PlanContent,
  PlanDescription,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Task,
  TaskContent,
  TaskItem,
  TaskItemFile,
  TaskTrigger,
} from "@/components/ai-elements/task";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@z0/ui/button";
import { CHAT_MESSAGE_FRAME_CLASS } from "@/components/chat/layout";
import {
  getDataPartName,
  getToolName,
  getToolTaskInfo,
  getToolTaskStatus,
  resolveDataRendererKind,
  resolveMessageRendererKind,
  resolveToolRendererKind,
  type DataRendererKind,
  type MessageRendererKind,
  type ToolRendererKind,
} from "@/lib/agent/chat/message-part-rendering";
import { cn } from "@/lib/utils";
import { useExecutorStore } from "@/store/executor";
import { useProjectStore } from "@/store/project";
import type { UIMessagePart } from "ai";
import { CopyIcon, FolderOpen, PlayIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { BundledLanguage } from "shiki";

type PartRenderer = (part: UIMessagePart<any, any>, index: number) => ReactNode;
type ToolPartRenderer = (
  part: UIMessagePart<any, any>,
  index: number,
  toolName: string,
) => ReactNode;
type DataPartRenderer = (
  part: UIMessagePart<any, any>,
  index: number,
  dataType: string,
) => ReactNode;

function OpenProjectButton({ projectId }: { projectId: string }) {
  const setProjectId = useProjectStore((state) => state.setProjectId);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setProjectId(projectId)}
      className="h-7 px-2 text-xs text-blue-400 hover:bg-blue-400/10 hover:text-blue-300"
    >
      <FolderOpen className="mr-1 size-3.5" />
      Open Project
    </Button>
  );
}

function CodeArtifactRenderer({
  artifactIndex,
  code,
  description,
  language,
  title,
}: {
  artifactIndex?: string;
  code: string;
  description?: string;
  language: string;
  title: string;
}) {
  const { openPanel } = useExecutorStore();

  const handleExecute = () => {
    openPanel(code, language as BundledLanguage);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className={CHAT_MESSAGE_FRAME_CLASS}>
      <Artifact className="my-2">
        <ArtifactHeader>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {artifactIndex ? (
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                  {artifactIndex}
                </span>
              ) : null}
              <ArtifactTitle>{title}</ArtifactTitle>
            </div>
            {description ? (
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            ) : null}
          </div>
          <ArtifactActions>
            <ArtifactAction
              icon={PlayIcon}
              tooltip="Run"
              onClick={handleExecute}
              className="text-green-400 hover:bg-green-500/10 hover:text-green-300"
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

function renderToolTaskItems(toolName: string, toolPart: any) {
  const items: ReactNode[] = [];
  const input = toolPart.input;
  const output = toolPart.output;
  const isCompleted = toolPart.state === "output-available";
  const isError = toolPart.state === "output-error";
  const isRunning =
    toolPart.state === "input-available" ||
    toolPart.state === "input-streaming";

  if (toolName === "tavilySearch") {
    if (input?.query) {
      items.push(
        <TaskItem key="query">
          Query:{" "}
          <span className="font-medium text-foreground">"{input.query}"</span>
        </TaskItem>,
      );
    }
    if (output?.results?.length) {
      items.push(
        <TaskItem key="results">
          Found {output.results.length} results
        </TaskItem>,
      );
      output.results.slice(0, 3).forEach((result: any, index: number) => {
        items.push(
          <TaskItem key={`result-${index}`}>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              {result.title || result.url}
            </a>
          </TaskItem>,
        );
      });
      if (output.results.length > 3) {
        items.push(
          <TaskItem key="more" className="text-zinc-500">
            +{output.results.length - 3} more results
          </TaskItem>,
        );
      }
    }
  } else if (toolName === "tavilyExtract" && input?.urls) {
    input.urls.forEach((url: string, index: number) => {
      items.push(
        <TaskItem key={`url-${index}`}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {url}
          </a>
        </TaskItem>,
      );
    });
  } else if (
    (toolName === "tavilyCrawl" || toolName === "tavilyMap") &&
    input?.url
  ) {
    items.push(
      <TaskItem key="url">
        <a
          href={input.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          {input.url}
        </a>
      </TaskItem>,
    );
    if (output?.pages) {
      items.push(
        <TaskItem key="pages">Discovered {output.pages.length} pages</TaskItem>,
      );
    }
  } else if (
    [
      "createProjectFile",
      "updateProjectFile",
      "patchProjectFile",
      "deleteProjectFile",
      "getProjectFile",
    ].includes(toolName)
  ) {
    if (input?.filePath) {
      items.push(
        <TaskItem key="file">
          <TaskItemFile>{input.filePath}</TaskItemFile>
        </TaskItem>,
      );
    }
  } else if (toolName === "readProjectFiles" && output?.files) {
    const fileNames = Object.keys(output.files);
    items.push(
      <TaskItem key="count">Loaded {fileNames.length} files</TaskItem>,
    );
    fileNames.slice(0, 5).forEach((name, index) => {
      items.push(
        <TaskItem key={`file-${index}`}>
          <TaskItemFile>{name}</TaskItemFile>
        </TaskItem>,
      );
    });
    if (fileNames.length > 5) {
      items.push(
        <TaskItem key="more" className="text-zinc-500">
          +{fileNames.length - 5} more files
        </TaskItem>,
      );
    }
  } else if (toolName === "createProject") {
    if (input?.name) {
      items.push(
        <TaskItem key="name">
          Project:{" "}
          <span className="font-medium text-foreground">{input.name}</span>
        </TaskItem>,
      );
    }
    if (input?.template) {
      items.push(
        <TaskItem key="template">Template: {input.template}</TaskItem>,
      );
    }
    if (isCompleted && output?.projectId) {
      items.push(
        <TaskItem key="open-project">
          <OpenProjectButton projectId={output.projectId} />
        </TaskItem>,
      );
    }
  } else if (
    ["addDependency", "removeDependency"].includes(toolName) &&
    input?.packages
  ) {
    items.push(
      <TaskItem key="packages">
        {input.packages.map((pkg: string, index: number) => (
          <span key={index} className="mr-2 inline-flex items-center gap-1">
            <span className="rounded bg-orange-500/10 px-1.5 py-0.5 font-mono text-xs text-orange-400">
              {pkg}
            </span>
          </span>
        ))}
      </TaskItem>,
    );
  } else if (toolName === "installDependencies") {
    if (isRunning) {
      items.push(
        <TaskItem key="progress">
          Installing packages from package.json...
        </TaskItem>,
      );
    }
    if (isCompleted) {
      items.push(
        <TaskItem key="done">All dependencies installed successfully</TaskItem>,
      );
    }
  } else if (toolName === "runBuild") {
    if (input?.mode) {
      items.push(
        <TaskItem key="mode">
          Mode: <span className="text-yellow-400">{input.mode}</span>
        </TaskItem>,
      );
    }
    if (isCompleted && output?.duration) {
      items.push(
        <TaskItem key="duration">Completed in {output.duration}ms</TaskItem>,
      );
    }
  } else if (
    toolName === "startDevServer" ||
    toolName === "startPreviewServer"
  ) {
    if (input?.port) {
      items.push(<TaskItem key="port">Port: {input.port}</TaskItem>);
    }
    if (isCompleted && output?.url) {
      items.push(
        <TaskItem key="url">
          <a
            href={output.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {output.url}
          </a>
        </TaskItem>,
      );
    }
  } else if (
    toolName === "captureScreenshot" ||
    toolName === "captureElementScreenshot"
  ) {
    if (input?.selector) {
      items.push(
        <TaskItem key="selector">
          Selector:{" "}
          <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">
            {input.selector}
          </code>
        </TaskItem>,
      );
    }
    if (isCompleted && output?.dataUrl) {
      items.push(
        <TaskItem key="preview">
          <img
            src={output.dataUrl}
            alt="Screenshot"
            className="mt-2 h-auto max-w-full rounded border border-zinc-700"
            style={{ maxHeight: 200 }}
          />
        </TaskItem>,
      );
    }
  } else if (isCompleted && output?.downloadUrl) {
    items.push(
      <TaskItem key="download">
        <a
          href={output.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          Download {output.filename || "file"}
        </a>
      </TaskItem>,
    );
  } else if (input?.filePath || input?.path) {
    items.push(
      <TaskItem key="file">
        <TaskItemFile>{input.filePath || input.path}</TaskItemFile>
      </TaskItem>,
    );
  }

  if (isError && toolPart.errorText) {
    items.push(
      <TaskItem key="error" className="text-red-400">
        {toolPart.errorText}
      </TaskItem>,
    );
  }

  if (isCompleted && output?.message && items.length === 0) {
    items.push(
      <TaskItem
        key="message"
        className={output.success === false ? "text-red-400" : undefined}
      >
        {output.message}
      </TaskItem>,
    );
  }

  return items.length > 0 ? items : null;
}

const basePartRenderers: Record<
  Exclude<MessageRendererKind, "tool" | "data" | "json">,
  PartRenderer
> = {
  text: (part, index) => (
    <MessageResponse key={index}>{(part as any).text}</MessageResponse>
  ),
  file: (part, index) => (
    <MessageAttachments key={index}>
      <MessageAttachment data={part as any} />
    </MessageAttachments>
  ),
  reasoning: (part, index) => (
    <div key={index} className={CHAT_MESSAGE_FRAME_CLASS}>
      <Reasoning isStreaming={(part as any).state === "streaming"}>
        <ReasoningTrigger />
        <ReasoningContent>{(part as any).text ?? ""}</ReasoningContent>
      </Reasoning>
    </div>
  ),
  "source-url": (part, index) => (
    <div key={index} className={CHAT_MESSAGE_FRAME_CLASS}>
      <Sources>
        <SourcesTrigger count={1} />
        <SourcesContent>
          <Source
            href={(part as any).url}
            title={(part as any).title || (part as any).url}
          >
            {(part as any).title || (part as any).url}
          </Source>
        </SourcesContent>
      </Sources>
    </div>
  ),
  "source-document": (part, index) => (
    <div key={index} className={CHAT_MESSAGE_FRAME_CLASS}>
      <Sources>
        <SourcesTrigger count={1} />
        <SourcesContent>
          <Source href="#" title={(part as any).title || "Document"}>
            {(part as any).title || "Document"}
          </Source>
        </SourcesContent>
      </Sources>
    </div>
  ),
  "step-start": () => null,
};

const toolPartRenderers: Record<ToolRendererKind, ToolPartRenderer> = {
  artifact: (part, index, toolName) => {
    const output = (part as any).output;
    const title =
      toolName === "updateArtifact"
        ? `${output.title || "Untitled"} (Updated)`
        : output.title || "Untitled";

    return (
      <CodeArtifactRenderer
        key={index}
        title={title}
        language={output.language || "text"}
        code={output.code}
        description={
          toolName === "updateArtifact" ? undefined : output.description
        }
        artifactIndex={output.index}
      />
    );
  },
  inspector: (part, index, toolName) => (
    <div key={index} className={CHAT_MESSAGE_FRAME_CLASS}>
      <Tool defaultOpen={false}>
        <ToolHeader
          title={toolName}
          type={(part as any).type}
          state={(part as any).state}
        />
        <ToolContent>
          {(part as any).input ? (
            <ToolInput input={(part as any).input} />
          ) : null}
          <ToolOutput
            output={(part as any).output}
            errorText={(part as any).errorText}
          />
        </ToolContent>
      </Tool>
    </div>
  ),
  task: (part, index, toolName) => {
    const toolPart = part as any;
    const isRunning =
      toolPart.state === "input-available" ||
      toolPart.state === "input-streaming";
    const taskInfo = getToolTaskInfo(
      toolName,
      toolPart.input,
      toolPart.output,
      isRunning,
    );

    return (
      <div key={index} className={cn(CHAT_MESSAGE_FRAME_CLASS, "my-2")}>
        <Task defaultOpen={false}>
          <TaskTrigger
            title={
              taskInfo.subtitle
                ? `${taskInfo.title} - ${taskInfo.subtitle}`
                : taskInfo.title
            }
            status={getToolTaskStatus(toolPart.state)}
            toolName={toolName}
          />
          <TaskContent>{renderToolTaskItems(toolName, toolPart)}</TaskContent>
        </Task>
      </div>
    );
  },
};

const dataPartRenderers: Record<DataRendererKind, DataPartRenderer> = {
  image: (part, index) => {
    const dataPart = part as any;
    return (
      <div key={index} className={cn(CHAT_MESSAGE_FRAME_CLASS, "my-2")}>
        <Image
          base64={dataPart.base64}
          uint8Array={dataPart.uint8Array}
          mediaType={dataPart.mediaType}
          alt={dataPart.alt || "Generated image"}
        />
      </div>
    );
  },
  artifact: (part, index) => {
    const dataPart = part as any;
    return (
      <div key={index} className={CHAT_MESSAGE_FRAME_CLASS}>
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
  },
  plan: (part, index) => {
    const dataPart = part as any;
    return (
      <div key={index} className={CHAT_MESSAGE_FRAME_CLASS}>
        <Plan isStreaming={false}>
          <PlanHeader>
            <PlanTitle>{dataPart.title || "Plan"}</PlanTitle>
            <PlanTrigger />
          </PlanHeader>
          {dataPart.description ? (
            <PlanDescription>{dataPart.description}</PlanDescription>
          ) : null}
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
  },
  "chain-of-thought": (part, index) => {
    const dataPart = part as any;
    return (
      <div key={index} className={CHAT_MESSAGE_FRAME_CLASS}>
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
  },
  "inline-citation": (part, index) => {
    const dataPart = part as any;
    return (
      <InlineCitation key={index}>
        <InlineCitationText>{dataPart.text}</InlineCitationText>
        {dataPart.sources?.length ? (
          <InlineCitationCard>
            <InlineCitationCardTrigger sources={dataPart.sources} />
            <InlineCitationCardBody>
              <InlineCitationCarousel>
                <InlineCitationCarouselContent>
                  {dataPart.sources.map(
                    (source: string, sourceIndex: number) => (
                      <InlineCitationCarouselItem key={sourceIndex}>
                        <InlineCitationSource url={source} />
                      </InlineCitationCarouselItem>
                    ),
                  )}
                </InlineCitationCarouselContent>
              </InlineCitationCarousel>
            </InlineCitationCardBody>
          </InlineCitationCard>
        ) : null}
      </InlineCitation>
    );
  },
  json: (part, index) => {
    const dataPart = part as any;
    const dataStr =
      typeof dataPart.data === "string"
        ? dataPart.data
        : JSON.stringify(dataPart.data, null, 2);

    return (
      <div key={index} className={CHAT_MESSAGE_FRAME_CLASS}>
        <CodeBlock code={dataStr} language="json">
          <CodeBlockCopyButton />
        </CodeBlock>
      </div>
    );
  },
};

function renderToolPart(part: UIMessagePart<any, any>, index: number) {
  const toolName = getToolName(part);

  if (!toolName) {
    return renderUnknownPart(part, index);
  }

  return toolPartRenderers[resolveToolRendererKind(toolName, part as any)](
    part,
    index,
    toolName,
  );
}

function renderDataPart(part: UIMessagePart<any, any>, index: number) {
  const dataType = getDataPartName(part);

  if (!dataType) {
    return renderUnknownPart(part, index);
  }

  return dataPartRenderers[resolveDataRendererKind(dataType)](
    part,
    index,
    dataType,
  );
}

function renderUnknownPart(part: UIMessagePart<any, any>, index: number) {
  return (
    <div key={index} className={CHAT_MESSAGE_FRAME_CLASS}>
      <CodeBlock code={JSON.stringify(part, null, 2)} language="json">
        <CodeBlockCopyButton />
      </CodeBlock>
    </div>
  );
}

export function renderMessagePart(
  part: UIMessagePart<any, any>,
  index: number,
) {
  const rendererKind = resolveMessageRendererKind(part);

  if (rendererKind === "tool") {
    return renderToolPart(part, index);
  }

  if (rendererKind === "data") {
    return renderDataPart(part, index);
  }

  if (rendererKind === "json") {
    return renderUnknownPart(part, index);
  }

  return basePartRenderers[rendererKind](part, index);
}
