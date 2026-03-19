import { z } from "zod";

export type AgentToolDecision =
  | "keep-internal"
  | "refactor-internal"
  | "future-skill"
  | "future-mcp";

export type AgentToolGroup =
  | "artifacts"
  | "packages"
  | "research"
  | "project-core"
  | "project-files"
  | "project-build"
  | "project-runtime"
  | "project-dom"
  | "project-observability"
  | "project-diff"
  | "system";

export type AgentToolPerformance =
  | "fast"
  | "moderate"
  | "expensive"
  | "stateful";

export type AgentToolCatalogEntry = {
  name: string;
  description: string;
  group: AgentToolGroup;
  performance: AgentToolPerformance;
  requiresProject?: boolean;
  requiresWebSearch?: boolean;
  decision: AgentToolDecision;
};

const defaultPassthroughToolInputSchema = z.object({}).passthrough();

const tavilySearchInputSchema = z.object({
  query: z.string().describe("The search query to look up on the web"),
  searchDepth: z
    .enum(["basic", "advanced", "fast", "ultra-fast"])
    .optional()
    .describe("The depth of the search"),
  timeRange: z
    .enum(["year", "month", "week", "day", "y", "m", "w", "d"])
    .optional()
    .describe("Time range for search results"),
});

export const AGENT_TOOL_CATALOG: AgentToolCatalogEntry[] = [
  {
    name: "createArtifact",
    description: "Create a new code artifact for the current chat.",
    group: "artifacts",
    performance: "fast",
    decision: "keep-internal",
  },
  {
    name: "readArtifact",
    description: "Read an existing artifact by index from the current chat.",
    group: "artifacts",
    performance: "fast",
    decision: "keep-internal",
  },
  {
    name: "updateArtifact",
    description: "Update an artifact with targeted code changes.",
    group: "artifacts",
    performance: "fast",
    decision: "keep-internal",
  },
  {
    name: "listArtifacts",
    description: "List all artifacts attached to the current chat.",
    group: "artifacts",
    performance: "fast",
    decision: "keep-internal",
  },
  {
    name: "saveFile",
    description: "Persist a generated file package.",
    group: "packages",
    performance: "moderate",
    decision: "keep-internal",
  },
  {
    name: "saveMultipleFiles",
    description: "Persist multiple generated files as a package.",
    group: "packages",
    performance: "moderate",
    decision: "keep-internal",
  },
  {
    name: "createZip",
    description: "Create a zip archive from generated files.",
    group: "packages",
    performance: "moderate",
    decision: "keep-internal",
  },
  {
    name: "listPackages",
    description: "List saved file packages.",
    group: "packages",
    performance: "fast",
    decision: "keep-internal",
  },
  {
    name: "runSandboxedScript",
    description: "Execute JavaScript in a guarded sandbox.",
    group: "system",
    performance: "expensive",
    decision: "refactor-internal",
  },
  {
    name: "getQuotaUsage",
    description: "Inspect current quota usage for the actor.",
    group: "system",
    performance: "fast",
    decision: "keep-internal",
  },
  {
    name: "terminateTask",
    description: "Terminate a tracked background task.",
    group: "system",
    performance: "stateful",
    decision: "keep-internal",
  },
  {
    name: "listTasks",
    description: "List tracked background tasks.",
    group: "system",
    performance: "fast",
    decision: "keep-internal",
  },
  {
    name: "logEvent",
    description: "Append an operational event log entry.",
    group: "system",
    performance: "moderate",
    decision: "refactor-internal",
  },
  {
    name: "queryEvents",
    description: "Query logged operational events.",
    group: "system",
    performance: "moderate",
    decision: "refactor-internal",
  },
  {
    name: "healthCheck",
    description: "Run a system health check.",
    group: "system",
    performance: "moderate",
    decision: "refactor-internal",
  },
  {
    name: "checkProjectWorkspaceHealth",
    description: "Inspect project runtime health.",
    group: "system",
    performance: "moderate",
    requiresProject: true,
    decision: "refactor-internal",
  },
  {
    name: "createProject",
    description: "Create a new project for the actor.",
    group: "project-core",
    performance: "stateful",
    decision: "keep-internal",
  },
  {
    name: "listProjects",
    description: "List the actor's projects.",
    group: "project-core",
    performance: "fast",
    decision: "keep-internal",
  },
  {
    name: "tavilySearch",
    description: "Search the public web.",
    group: "research",
    performance: "moderate",
    requiresWebSearch: true,
    decision: "keep-internal",
  },
  {
    name: "tavilyExtract",
    description: "Extract content from a specific URL.",
    group: "research",
    performance: "moderate",
    requiresWebSearch: true,
    decision: "keep-internal",
  },
  {
    name: "tavilyCrawl",
    description: "Crawl a website for additional pages.",
    group: "research",
    performance: "expensive",
    requiresWebSearch: true,
    decision: "keep-internal",
  },
  {
    name: "tavilyMap",
    description: "Map a website structure.",
    group: "research",
    performance: "expensive",
    requiresWebSearch: true,
    decision: "keep-internal",
  },
  {
    name: "readProjectFiles",
    description: "List project files or directories.",
    group: "project-files",
    performance: "fast",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "getProjectFile",
    description: "Read a specific file from the project.",
    group: "project-files",
    performance: "fast",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "existsProjectFile",
    description: "Check whether a file exists in the project.",
    group: "project-files",
    performance: "fast",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "createProjectFile",
    description: "Create a new file in the project.",
    group: "project-files",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "updateProjectFile",
    description: "Replace the content of an existing project file.",
    group: "project-files",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "patchProjectFile",
    description: "Patch a project file with targeted edits.",
    group: "project-files",
    performance: "moderate",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "deleteProjectFile",
    description: "Delete a file from the project.",
    group: "project-files",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "getProjectInfo",
    description: "Read project metadata and files.",
    group: "project-files",
    performance: "fast",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "updateProjectInfo",
    description: "Update project metadata.",
    group: "project-files",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "addDependency",
    description: "Add a dependency to the project.",
    group: "project-build",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "removeDependency",
    description: "Remove a dependency from the project.",
    group: "project-build",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "installDependencies",
    description: "Install project dependencies.",
    group: "project-build",
    performance: "expensive",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "runBuild",
    description: "Run the project build.",
    group: "project-build",
    performance: "expensive",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "runLint",
    description: "Run lint checks for the project.",
    group: "project-build",
    performance: "expensive",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "runFormat",
    description: "Format project files.",
    group: "project-build",
    performance: "moderate",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "runScript",
    description: "Run a project script.",
    group: "project-build",
    performance: "expensive",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "startDevServer",
    description: "Start the project's dev server.",
    group: "project-runtime",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "startPreviewServer",
    description: "Start the project's preview server.",
    group: "project-runtime",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "stopServer",
    description: "Stop the project's running server.",
    group: "project-runtime",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "proxyRequestToDevServer",
    description: "Proxy an HTTP request to the project dev server.",
    group: "project-runtime",
    performance: "stateful",
    requiresProject: true,
    decision: "refactor-internal",
  },
  {
    name: "getServerStatus",
    description: "Inspect project server status.",
    group: "project-runtime",
    performance: "fast",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "inspectDOM",
    description: "Inspect the live DOM of the running project.",
    group: "project-dom",
    performance: "expensive",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "queryElement",
    description: "Query a single DOM element from the running project.",
    group: "project-dom",
    performance: "moderate",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "queryElements",
    description: "Query multiple DOM elements from the running project.",
    group: "project-dom",
    performance: "moderate",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "captureScreenshot",
    description: "Capture a screenshot of the running project.",
    group: "project-dom",
    performance: "expensive",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "captureElementScreenshot",
    description: "Capture a screenshot of a DOM element.",
    group: "project-dom",
    performance: "expensive",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "evaluateClientScript",
    description: "Evaluate client-side JavaScript in the running project.",
    group: "project-dom",
    performance: "expensive",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "readClientState",
    description: "Read client-side state from the running project.",
    group: "project-dom",
    performance: "moderate",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "simulateClick",
    description: "Simulate a click in the running project.",
    group: "project-dom",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "simulateInput",
    description: "Simulate text input in the running project.",
    group: "project-dom",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "getConsoleLogs",
    description: "Read browser console logs.",
    group: "project-observability",
    performance: "moderate",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "clearConsoleLogs",
    description: "Clear captured browser console logs.",
    group: "project-observability",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "getNetworkRequests",
    description: "Inspect captured network requests.",
    group: "project-observability",
    performance: "moderate",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "clearNetworkRequests",
    description: "Clear captured network requests.",
    group: "project-observability",
    performance: "stateful",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "getPerformanceMetrics",
    description: "Read performance metrics from the running project.",
    group: "project-observability",
    performance: "moderate",
    requiresProject: true,
    decision: "keep-internal",
  },
  {
    name: "generateDiff",
    description: "Generate a diff for project files.",
    group: "project-diff",
    performance: "moderate",
    requiresProject: true,
    decision: "future-skill",
  },
  {
    name: "applyDiff",
    description: "Apply a diff to project files.",
    group: "project-diff",
    performance: "stateful",
    requiresProject: true,
    decision: "future-skill",
  },
  {
    name: "generateASTPatch",
    description: "Generate an AST-aware patch for project files.",
    group: "project-diff",
    performance: "expensive",
    requiresProject: true,
    decision: "future-skill",
  },
  {
    name: "searchReplace",
    description: "Run a structured search and replace on project files.",
    group: "project-diff",
    performance: "fast",
    requiresProject: true,
    decision: "future-skill",
  },
] as const;

export function getEnabledAgentToolCatalog(params: {
  webSearchEnabled: boolean;
  projectId: string | null;
}) {
  return AGENT_TOOL_CATALOG.filter((entry) => {
    if (entry.requiresWebSearch && !params.webSearchEnabled) {
      return false;
    }

    if (entry.requiresProject && !params.projectId) {
      return false;
    }

    return true;
  });
}

export function summarizeAgentToolCatalog(
  entries: AgentToolCatalogEntry[] = AGENT_TOOL_CATALOG,
) {
  return {
    total: entries.length,
    keepInternal: entries.filter((entry) => entry.decision === "keep-internal")
      .length,
    refactorInternal: entries.filter(
      (entry) => entry.decision === "refactor-internal",
    ).length,
    futureSkill: entries.filter((entry) => entry.decision === "future-skill")
      .length,
    futureMcp: entries.filter((entry) => entry.decision === "future-mcp")
      .length,
    fast: entries.filter((entry) => entry.performance === "fast").length,
    moderate: entries.filter((entry) => entry.performance === "moderate")
      .length,
    expensive: entries.filter((entry) => entry.performance === "expensive")
      .length,
    stateful: entries.filter((entry) => entry.performance === "stateful")
      .length,
    requiresProject: entries.filter((entry) => entry.requiresProject).length,
    requiresWebSearch: entries.filter((entry) => entry.requiresWebSearch)
      .length,
  };
}

export function getAgentToolInputSchema(toolName: string) {
  switch (toolName) {
    case "tavilySearch":
      return tavilySearchInputSchema;
    default:
      return defaultPassthroughToolInputSchema;
  }
}
