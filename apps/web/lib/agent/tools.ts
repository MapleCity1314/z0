import { guardToolSet, withSemanticToolGuard } from "@/lib/agent/tool-guards";
import {
  createArtifactTool,
  listArtifactsTool,
  readArtifactTool,
  updateArtifactTool,
} from "@/lib/tools/codeArtifactTool";
import {
  createZipTool,
  listPackagesTool,
  saveFileTool,
  saveMultipleFilesTool,
} from "@/lib/tools/filePackageTool";
import {
  healthCheckTool,
  listTasksTool,
  logEventTool,
  queryEventsTool,
  runSandboxedScriptTool,
  getQuotaUsageTool,
  terminateTaskTool,
} from "@/lib/tools/systemTools";
import {
  tavilyCrawlTool,
  tavilyExtractTool,
  tavilyMapTool,
  tavilySearchTool,
} from "@/lib/tools/tavilyTools";
import {
  addDependencyTool,
  installDependenciesTool,
  removeDependencyTool,
  runBuildTool,
  runFormatTool,
  runLintTool,
  runScriptTool,
} from "@/lib/project/tools/buildTools";
import {
  applyDiffTool,
  generateASTPatchTool,
  generateDiffTool,
  searchReplaceTool,
} from "@/lib/project/tools/diffTools";
import {
  captureElementScreenshotTool,
  captureScreenshotTool,
  evaluateClientScriptTool,
  inspectDOMTool,
  queryElementTool,
  queryElementsTool,
  readClientStateTool,
  simulateClickTool,
  simulateInputTool,
  updateDOMData,
} from "@/lib/project/tools/domTools";
import {
  clearConsoleLogsTool,
  clearNetworkRequestsTool,
  getConsoleLogsTool,
  getNetworkRequestsTool,
  getPerformanceMetricsTool,
} from "@/lib/project/tools/observabilityTools";
import { checkProjectWorkspaceHealthTool } from "@/lib/project/tools/healthTools";
import {
  createProjectTool,
  createProjectFileTool,
  deleteProjectFileTool,
  existsProjectFileTool,
  getProjectFileTool,
  getProjectInfoTool,
  listProjectsTool,
  patchProjectFileTool,
  readProjectFilesTool,
  updateProjectFileTool,
  updateProjectInfoTool,
} from "@/lib/project/tools/projectTools";
import {
  getServerStatusTool,
  proxyRequestToDevServerTool,
  startDevServerTool,
  startPreviewServerTool,
  stopServerTool,
} from "@/lib/project/tools/runtimeTools";

export {
  tavilySearchTool,
  tavilyExtractTool,
  tavilyCrawlTool,
  tavilyMapTool,
} from "@/lib/tools/tavilyTools";

export {
  createArtifactTool,
  readArtifactTool,
  updateArtifactTool,
  listArtifactsTool,
} from "@/lib/tools/codeArtifactTool";

export {
  readProjectFilesTool,
  getProjectFileTool,
  existsProjectFileTool,
  createProjectFileTool,
  updateProjectFileTool,
  patchProjectFileTool,
  deleteProjectFileTool,
  getProjectInfoTool,
  updateProjectInfoTool,
  createProjectTool,
  listProjectsTool,
} from "@/lib/project/tools/projectTools";

export {
  addDependencyTool,
  removeDependencyTool,
  installDependenciesTool,
  runBuildTool,
  runLintTool,
  runFormatTool,
  runScriptTool,
} from "@/lib/project/tools/buildTools";

export {
  startDevServerTool,
  startPreviewServerTool,
  stopServerTool,
  proxyRequestToDevServerTool,
  getServerStatusTool,
} from "@/lib/project/tools/runtimeTools";

export {
  inspectDOMTool,
  queryElementTool,
  queryElementsTool,
  captureScreenshotTool,
  captureElementScreenshotTool,
  evaluateClientScriptTool,
  readClientStateTool,
  simulateClickTool,
  simulateInputTool,
  updateDOMData,
} from "@/lib/project/tools/domTools";

export {
  getConsoleLogsTool,
  clearConsoleLogsTool,
  getNetworkRequestsTool,
  clearNetworkRequestsTool,
  getPerformanceMetricsTool,
} from "@/lib/project/tools/observabilityTools";
export { checkProjectWorkspaceHealthTool } from "@/lib/project/tools/healthTools";

export {
  generateDiffTool,
  applyDiffTool,
  generateASTPatchTool,
  searchReplaceTool,
} from "@/lib/project/tools/diffTools";

export {
  runSandboxedScriptTool,
  getQuotaUsageTool,
  terminateTaskTool,
  listTasksTool,
  logEventTool,
  queryEventsTool,
  healthCheckTool,
} from "@/lib/tools/systemTools";

export {
  saveFileTool,
  saveMultipleFilesTool,
  createZipTool,
  listPackagesTool,
} from "@/lib/tools/filePackageTool";

function wrapToolWithProjectId<T extends Record<string, any>>(
  originalTool: T,
  projectId: string,
  toolName: string,
): T {
  return withSemanticToolGuard(toolName, originalTool, (context) => ({
    ...(context as Record<string, unknown>),
    messages: { projectId },
  }));
}

export function getProjectTools(projectId: string | null | undefined) {
  if (!projectId) {
    return null;
  }

  return guardToolSet({
    readProjectFiles: wrapToolWithProjectId(readProjectFilesTool, projectId, "readProjectFiles"),
    getProjectFile: wrapToolWithProjectId(getProjectFileTool, projectId, "getProjectFile"),
    existsProjectFile: wrapToolWithProjectId(existsProjectFileTool, projectId, "existsProjectFile"),
    createProjectFile: wrapToolWithProjectId(createProjectFileTool, projectId, "createProjectFile"),
    updateProjectFile: wrapToolWithProjectId(updateProjectFileTool, projectId, "updateProjectFile"),
    patchProjectFile: wrapToolWithProjectId(patchProjectFileTool, projectId, "patchProjectFile"),
    deleteProjectFile: wrapToolWithProjectId(deleteProjectFileTool, projectId, "deleteProjectFile"),
    getProjectInfo: wrapToolWithProjectId(getProjectInfoTool, projectId, "getProjectInfo"),
    updateProjectInfo: wrapToolWithProjectId(updateProjectInfoTool, projectId, "updateProjectInfo"),

    addDependency: wrapToolWithProjectId(addDependencyTool, projectId, "addDependency"),
    removeDependency: wrapToolWithProjectId(removeDependencyTool, projectId, "removeDependency"),
    installDependencies: wrapToolWithProjectId(installDependenciesTool, projectId, "installDependencies"),
    runBuild: wrapToolWithProjectId(runBuildTool, projectId, "runBuild"),
    runLint: wrapToolWithProjectId(runLintTool, projectId, "runLint"),
    runFormat: wrapToolWithProjectId(runFormatTool, projectId, "runFormat"),
    runScript: wrapToolWithProjectId(runScriptTool, projectId, "runScript"),

    startDevServer: wrapToolWithProjectId(startDevServerTool, projectId, "startDevServer"),
    startPreviewServer: wrapToolWithProjectId(startPreviewServerTool, projectId, "startPreviewServer"),
    stopServer: wrapToolWithProjectId(stopServerTool, projectId, "stopServer"),
    proxyRequestToDevServer: wrapToolWithProjectId(proxyRequestToDevServerTool, projectId, "proxyRequestToDevServer"),
    getServerStatus: wrapToolWithProjectId(getServerStatusTool, projectId, "getServerStatus"),

    inspectDOM: wrapToolWithProjectId(inspectDOMTool, projectId, "inspectDOM"),
    queryElement: wrapToolWithProjectId(queryElementTool, projectId, "queryElement"),
    queryElements: wrapToolWithProjectId(queryElementsTool, projectId, "queryElements"),
    captureScreenshot: wrapToolWithProjectId(captureScreenshotTool, projectId, "captureScreenshot"),
    captureElementScreenshot: wrapToolWithProjectId(captureElementScreenshotTool, projectId, "captureElementScreenshot"),
    evaluateClientScript: wrapToolWithProjectId(evaluateClientScriptTool, projectId, "evaluateClientScript"),
    readClientState: wrapToolWithProjectId(readClientStateTool, projectId, "readClientState"),
    simulateClick: wrapToolWithProjectId(simulateClickTool, projectId, "simulateClick"),
    simulateInput: wrapToolWithProjectId(simulateInputTool, projectId, "simulateInput"),

    getConsoleLogs: wrapToolWithProjectId(getConsoleLogsTool, projectId, "getConsoleLogs"),
    clearConsoleLogs: wrapToolWithProjectId(clearConsoleLogsTool, projectId, "clearConsoleLogs"),
    getNetworkRequests: wrapToolWithProjectId(getNetworkRequestsTool, projectId, "getNetworkRequests"),
    clearNetworkRequests: wrapToolWithProjectId(clearNetworkRequestsTool, projectId, "clearNetworkRequests"),
    getPerformanceMetrics: wrapToolWithProjectId(getPerformanceMetricsTool, projectId, "getPerformanceMetrics"),

    generateDiff: wrapToolWithProjectId(generateDiffTool, projectId, "generateDiff"),
    applyDiff: wrapToolWithProjectId(applyDiffTool, projectId, "applyDiff"),
    generateASTPatch: wrapToolWithProjectId(generateASTPatchTool, projectId, "generateASTPatch"),
    searchReplace: wrapToolWithProjectId(searchReplaceTool, projectId, "searchReplace"),
  });
}

export function getCommonTools() {
  return guardToolSet({
    runSandboxedScript: withSemanticToolGuard("runSandboxedScript", runSandboxedScriptTool),
    getQuotaUsage: withSemanticToolGuard("getQuotaUsage", getQuotaUsageTool),
    terminateTask: withSemanticToolGuard("terminateTask", terminateTaskTool),
    listTasks: withSemanticToolGuard("listTasks", listTasksTool),
    logEvent: withSemanticToolGuard("logEvent", logEventTool),
    queryEvents: withSemanticToolGuard("queryEvents", queryEventsTool),
    healthCheck: withSemanticToolGuard("healthCheck", healthCheckTool),
    checkProjectWorkspaceHealth: withSemanticToolGuard(
      "checkProjectWorkspaceHealth",
      checkProjectWorkspaceHealthTool,
    ),
    createProject: withSemanticToolGuard("createProject", createProjectTool),
    listProjects: withSemanticToolGuard("listProjects", listProjectsTool),
  });
}
