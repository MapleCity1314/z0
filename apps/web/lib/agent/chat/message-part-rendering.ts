import type { UIMessage, UIMessagePart } from "ai";

export type ToolTaskInfo = {
  title: string;
  subtitle?: string;
};

export type ToolRendererKind = "artifact" | "inspector" | "task";
export type DataRendererKind =
  | "image"
  | "artifact"
  | "plan"
  | "chain-of-thought"
  | "inline-citation"
  | "json";
export type MessageRendererKind =
  | "text"
  | "file"
  | "reasoning"
  | "source-url"
  | "source-document"
  | "tool"
  | "data"
  | "step-start"
  | "json";

export function isToolPart(
  part: UIMessagePart<any, any>,
): part is UIMessagePart<any, any> & { type: `tool-${string}` } {
  return typeof part.type === "string" && part.type.startsWith("tool-");
}

export function isDataPart(
  part: UIMessagePart<any, any>,
): part is UIMessagePart<any, any> & { type: `data-${string}` } {
  return typeof part.type === "string" && part.type.startsWith("data-");
}

export function getMessageCopyText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export function getToolName(part: UIMessagePart<any, any>) {
  if (!isToolPart(part)) {
    return null;
  }

  return (part as any).toolName || part.type.replace("tool-", "");
}

export function getDataPartName(part: UIMessagePart<any, any>) {
  if (!isDataPart(part)) {
    return null;
  }

  return part.type.replace("data-", "");
}

export function resolveToolRendererKind(
  toolName: string,
  toolPart: Record<string, any>,
): ToolRendererKind {
  if (
    ["createArtifact", "codeArtifact", "updateArtifact"].includes(toolName) &&
    toolPart.output?.code
  ) {
    return "artifact";
  }

  if (["readArtifact", "listArtifacts"].includes(toolName)) {
    return "inspector";
  }

  return "task";
}

export function resolveDataRendererKind(dataType: string): DataRendererKind {
  const knownKinds = new Set<DataRendererKind>([
    "image",
    "artifact",
    "plan",
    "chain-of-thought",
    "inline-citation",
  ]);

  return knownKinds.has(dataType as DataRendererKind)
    ? (dataType as DataRendererKind)
    : "json";
}

export function resolveMessageRendererKind(
  part: UIMessagePart<any, any>,
): MessageRendererKind {
  if (part.type === "text") {
    return "text";
  }

  if (part.type === "file") {
    return "file";
  }

  if (part.type === "reasoning") {
    return "reasoning";
  }

  if (part.type === "source-url") {
    return "source-url";
  }

  if (part.type === "source-document") {
    return "source-document";
  }

  if (part.type === "step-start") {
    return "step-start";
  }

  if (isToolPart(part)) {
    return "tool";
  }

  if (isDataPart(part)) {
    return "data";
  }

  return "json";
}

export function getToolTaskStatus(state?: string) {
  if (state === "output-error") {
    return "error" as const;
  }

  if (state === "input-available" || state === "input-streaming") {
    return "running" as const;
  }

  return "success" as const;
}

export function getToolTaskInfo(
  toolName: string,
  input: Record<string, any> | undefined,
  output: Record<string, any> | undefined,
  isRunning: boolean,
): ToolTaskInfo {
  const info: Record<string, ToolTaskInfo> = {
    tavilySearch: {
      title: isRunning ? "Searching the web..." : "Web search completed",
      subtitle: input?.query ? `"${input.query}"` : undefined,
    },
    tavilyExtract: {
      title: isRunning ? "Extracting content..." : "Content extracted",
      subtitle: input?.urls?.length ? `${input.urls.length} URL(s)` : undefined,
    },
    tavilyCrawl: {
      title: isRunning ? "Crawling website..." : "Website crawled",
      subtitle: input?.url,
    },
    tavilyMap: {
      title: isRunning ? "Mapping site structure..." : "Site mapped",
      subtitle: input?.url,
    },
    readProjectFiles: {
      title: isRunning ? "Reading project files..." : "Files loaded",
      subtitle: output?.files
        ? `${Object.keys(output.files).length} files`
        : undefined,
    },
    getProjectFile: {
      title: isRunning ? "Reading file..." : "File loaded",
      subtitle: input?.filePath,
    },
    existsProjectFile: {
      title: isRunning
        ? "Checking file..."
        : output?.exists
          ? "File exists"
          : "File not found",
      subtitle: input?.filePath,
    },
    createProjectFile: {
      title: isRunning ? "Creating file..." : "File created",
      subtitle: input?.filePath,
    },
    updateProjectFile: {
      title: isRunning ? "Updating file..." : "File updated",
      subtitle: input?.filePath,
    },
    patchProjectFile: {
      title: isRunning ? "Patching file..." : "File patched",
      subtitle: input?.filePath,
    },
    deleteProjectFile: {
      title: isRunning ? "Deleting file..." : "File deleted",
      subtitle: input?.filePath,
    },
    getProjectInfo: {
      title: isRunning ? "Loading project info..." : "Project info loaded",
    },
    updateProjectInfo: {
      title: isRunning ? "Updating project..." : "Project updated",
    },
    createProject: {
      title: isRunning ? "Creating new project..." : "Project created",
      subtitle: input?.name || output?.name,
    },
    listProjects: {
      title: isRunning ? "Loading projects..." : "Projects loaded",
      subtitle: output?.projects
        ? `${output.projects.length} projects`
        : undefined,
    },
    addDependency: {
      title: isRunning ? "Installing packages..." : "Packages installed",
      subtitle: input?.packages?.join(", "),
    },
    removeDependency: {
      title: isRunning ? "Removing packages..." : "Packages removed",
      subtitle: input?.packages?.join(", "),
    },
    installDependencies: {
      title: isRunning
        ? "Installing dependencies..."
        : "Dependencies installed",
    },
    runBuild: {
      title: isRunning ? "Building project..." : "Build completed",
      subtitle: input?.mode || "production",
    },
    runLint: {
      title: isRunning ? "Running linter..." : "Lint completed",
    },
    runFormat: {
      title: isRunning ? "Formatting code..." : "Code formatted",
    },
    runScript: {
      title: isRunning ? "Running script..." : "Script completed",
      subtitle: input?.script,
    },
    startDevServer: {
      title: isRunning ? "Starting dev server..." : "Dev server running",
      subtitle: output?.url || (input?.port ? `Port ${input.port}` : undefined),
    },
    startPreviewServer: {
      title: isRunning ? "Starting preview..." : "Preview ready",
      subtitle: output?.url,
    },
    stopServer: {
      title: isRunning ? "Stopping server..." : "Server stopped",
    },
    proxyRequestToDevServer: {
      title: isRunning ? "Proxying request..." : "Request completed",
      subtitle: input?.path,
    },
    getServerStatus: {
      title: isRunning
        ? "Checking server..."
        : output?.running
          ? "Server running"
          : "Server stopped",
    },
    inspectDOM: {
      title: isRunning ? "Inspecting DOM..." : "DOM inspected",
    },
    queryElement: {
      title: isRunning ? "Querying element..." : "Element found",
      subtitle: input?.selector,
    },
    queryElements: {
      title: isRunning
        ? "Querying elements..."
        : `Found ${output?.elements?.length || 0} elements`,
      subtitle: input?.selector,
    },
    captureScreenshot: {
      title: isRunning ? "Capturing screenshot..." : "Screenshot captured",
    },
    captureElementScreenshot: {
      title: isRunning ? "Capturing element..." : "Element captured",
      subtitle: input?.selector,
    },
    evaluateClientScript: {
      title: isRunning ? "Evaluating script..." : "Script executed",
    },
    readClientState: {
      title: isRunning ? "Reading state..." : "State loaded",
    },
    getConsoleLogs: {
      title: isRunning ? "Getting logs..." : "Logs retrieved",
      subtitle: output?.logs ? `${output.logs.length} entries` : undefined,
    },
    clearConsoleLogs: {
      title: isRunning ? "Clearing logs..." : "Logs cleared",
    },
    getNetworkRequests: {
      title: isRunning ? "Getting requests..." : "Requests retrieved",
      subtitle: output?.requests
        ? `${output.requests.length} requests`
        : undefined,
    },
    clearNetworkRequests: {
      title: isRunning ? "Clearing requests..." : "Requests cleared",
    },
    getPerformanceMetrics: {
      title: isRunning ? "Getting metrics..." : "Metrics retrieved",
    },
    generateDiff: {
      title: isRunning ? "Generating diff..." : "Diff generated",
    },
    applyDiff: {
      title: isRunning ? "Applying changes..." : "Changes applied",
      subtitle: input?.filePath,
    },
    generateASTPatch: {
      title: isRunning ? "Generating AST patch..." : "AST patch generated",
      subtitle: input?.filePath,
    },
    runSandboxedScript: {
      title: isRunning ? "Running in sandbox..." : "Script completed",
    },
    getQuotaUsage: {
      title: isRunning ? "Checking quota..." : "Quota retrieved",
    },
    terminateTask: {
      title: isRunning ? "Terminating..." : "Task terminated",
    },
    logEvent: {
      title: isRunning ? "Logging event..." : "Event logged",
    },
    saveFile: {
      title: isRunning ? "Saving file..." : "File saved",
      subtitle: input?.filename,
    },
    saveMultipleFiles: {
      title: isRunning ? "Saving files..." : "Files saved",
      subtitle: input?.files ? `${input.files.length} files` : undefined,
    },
    createZip: {
      title: isRunning ? "Creating archive..." : "Archive created",
      subtitle: output?.filename,
    },
    listPackages: {
      title: isRunning ? "Listing packages..." : "Packages listed",
    },
  };

  return (
    info[toolName] || {
      title: isRunning ? `Running ${toolName}...` : `${toolName} completed`,
    }
  );
}
