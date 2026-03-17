import { tool } from "ai";
import { z } from "zod";
import { createInternalAuthHeaders } from "../auth/internal";

const passthroughInputSchema = z.object({}).passthrough();

type ToolCatalogEntry = {
  name: string;
  description: string;
  requiresProject?: boolean;
  requiresWebSearch?: boolean;
};

const TOOL_CATALOG: ToolCatalogEntry[] = [
  { name: "createArtifact", description: "Create a new code artifact for the current chat." },
  { name: "readArtifact", description: "Read an existing artifact by index from the current chat." },
  { name: "updateArtifact", description: "Update an artifact with targeted code changes." },
  { name: "listArtifacts", description: "List all artifacts attached to the current chat." },
  { name: "saveFile", description: "Persist a generated file package." },
  { name: "saveMultipleFiles", description: "Persist multiple generated files as a package." },
  { name: "createZip", description: "Create a zip archive from generated files." },
  { name: "listPackages", description: "List saved file packages." },
  { name: "runSandboxedScript", description: "Execute JavaScript in a guarded sandbox." },
  { name: "getQuotaUsage", description: "Inspect current quota usage for the actor." },
  { name: "terminateTask", description: "Terminate a tracked background task." },
  { name: "listTasks", description: "List tracked background tasks." },
  { name: "logEvent", description: "Append an operational event log entry." },
  { name: "queryEvents", description: "Query logged operational events." },
  { name: "healthCheck", description: "Run a system health check." },
  { name: "checkProjectWorkspaceHealth", description: "Inspect project runtime health.", requiresProject: true },
  { name: "createProject", description: "Create a new project for the actor." },
  { name: "listProjects", description: "List the actor's projects." },
  { name: "tavilySearch", description: "Search the public web.", requiresWebSearch: true },
  { name: "tavilyExtract", description: "Extract content from a specific URL.", requiresWebSearch: true },
  { name: "tavilyCrawl", description: "Crawl a website for additional pages.", requiresWebSearch: true },
  { name: "tavilyMap", description: "Map a website structure.", requiresWebSearch: true },
  { name: "readProjectFiles", description: "List project files or directories.", requiresProject: true },
  { name: "getProjectFile", description: "Read a specific file from the project.", requiresProject: true },
  { name: "existsProjectFile", description: "Check whether a file exists in the project.", requiresProject: true },
  { name: "createProjectFile", description: "Create a new file in the project.", requiresProject: true },
  { name: "updateProjectFile", description: "Replace the content of an existing project file.", requiresProject: true },
  { name: "patchProjectFile", description: "Patch a project file with targeted edits.", requiresProject: true },
  { name: "deleteProjectFile", description: "Delete a file from the project.", requiresProject: true },
  { name: "getProjectInfo", description: "Read project metadata and files.", requiresProject: true },
  { name: "updateProjectInfo", description: "Update project metadata.", requiresProject: true },
  { name: "addDependency", description: "Add a dependency to the project.", requiresProject: true },
  { name: "removeDependency", description: "Remove a dependency from the project.", requiresProject: true },
  { name: "installDependencies", description: "Install project dependencies.", requiresProject: true },
  { name: "runBuild", description: "Run the project build.", requiresProject: true },
  { name: "runLint", description: "Run lint checks for the project.", requiresProject: true },
  { name: "runFormat", description: "Format project files.", requiresProject: true },
  { name: "runScript", description: "Run a project script.", requiresProject: true },
  { name: "startDevServer", description: "Start the project's dev server.", requiresProject: true },
  { name: "startPreviewServer", description: "Start the project's preview server.", requiresProject: true },
  { name: "stopServer", description: "Stop the project's running server.", requiresProject: true },
  { name: "proxyRequestToDevServer", description: "Proxy an HTTP request to the project dev server.", requiresProject: true },
  { name: "getServerStatus", description: "Inspect project server status.", requiresProject: true },
  { name: "inspectDOM", description: "Inspect the live DOM of the running project.", requiresProject: true },
  { name: "queryElement", description: "Query a single DOM element from the running project.", requiresProject: true },
  { name: "queryElements", description: "Query multiple DOM elements from the running project.", requiresProject: true },
  { name: "captureScreenshot", description: "Capture a screenshot of the running project.", requiresProject: true },
  { name: "captureElementScreenshot", description: "Capture a screenshot of a DOM element.", requiresProject: true },
  { name: "evaluateClientScript", description: "Evaluate client-side JavaScript in the running project.", requiresProject: true },
  { name: "readClientState", description: "Read client-side state from the running project.", requiresProject: true },
  { name: "simulateClick", description: "Simulate a click in the running project.", requiresProject: true },
  { name: "simulateInput", description: "Simulate text input in the running project.", requiresProject: true },
  { name: "getConsoleLogs", description: "Read browser console logs.", requiresProject: true },
  { name: "clearConsoleLogs", description: "Clear captured browser console logs.", requiresProject: true },
  { name: "getNetworkRequests", description: "Inspect captured network requests.", requiresProject: true },
  { name: "clearNetworkRequests", description: "Clear captured network requests.", requiresProject: true },
  { name: "getPerformanceMetrics", description: "Read performance metrics from the running project.", requiresProject: true },
  { name: "generateDiff", description: "Generate a diff for project files.", requiresProject: true },
  { name: "applyDiff", description: "Apply a diff to project files.", requiresProject: true },
  { name: "generateASTPatch", description: "Generate an AST-aware patch for project files.", requiresProject: true },
  { name: "searchReplace", description: "Run a structured search and replace on project files.", requiresProject: true },
];

function getWebBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function createRemoteAgentTools(params: {
  actor: { userId: string; role?: string | null };
  webSearchEnabled: boolean;
  projectId: string | null;
  chatId: string;
}) {
  const webBaseUrl = getWebBaseUrl();

  const entries = TOOL_CATALOG.filter((entry) => {
    if (entry.requiresWebSearch && !params.webSearchEnabled) {
      return false;
    }

    if (entry.requiresProject && !params.projectId) {
      return false;
    }

    return true;
  }).map((entry) => [
    entry.name,
    tool({
      description: entry.description,
      inputSchema: passthroughInputSchema,
      execute: async (input, context) => {
        const internalHeaders = createInternalAuthHeaders({
          actor: {
            userId: params.actor.userId,
            role: params.actor.role ?? "user",
          },
          purpose: "agent-bridge",
        });
        const response = await fetch(
          `${webBaseUrl}/api/agent/tools/${encodeURIComponent(entry.name)}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...internalHeaders,
            },
            body: JSON.stringify({
              chatId: params.chatId,
              projectId: params.projectId,
              webSearchEnabled: params.webSearchEnabled,
              toolCallId: context.toolCallId,
              input,
              context: {
                messages: context.messages,
              },
            }),
            cache: "no-store",
          },
        );

        const payload = (await response.json()) as {
          data?: unknown;
          error?: { message?: string };
        };

        if (!response.ok || payload.error) {
          throw new Error(
            payload.error?.message ??
              `${entry.name} failed with ${response.status}`,
          );
        }

        return payload.data;
      },
    }),
  ]);

  return Object.fromEntries(entries);
}
