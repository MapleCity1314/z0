import { getEnabledAgentToolCatalog } from "@z0/backend/agent/tool-catalog";
import {
  createArtifactTool,
  createZipTool,
  getCommonTools,
  getProjectTools,
  listArtifactsTool,
  listPackagesTool,
  readArtifactTool,
  saveFileTool,
  saveMultipleFilesTool,
  tavilyCrawlTool,
  tavilyExtractTool,
  tavilyMapTool,
  tavilySearchTool,
  updateArtifactTool,
} from "@/lib/agent/tools";
import { guardToolSet } from "@/lib/agent/tool-guards";

export function buildAgentTools(
  webSearchEnabled: boolean,
  projectId: string | null,
) {
  const toolImplementations = {
    tavilySearch: tavilySearchTool,
    tavilyExtract: tavilyExtractTool,
    tavilyCrawl: tavilyCrawlTool,
    tavilyMap: tavilyMapTool,
    createArtifact: createArtifactTool,
    readArtifact: readArtifactTool,
    updateArtifact: updateArtifactTool,
    listArtifacts: listArtifactsTool,
    saveFile: saveFileTool,
    saveMultipleFiles: saveMultipleFilesTool,
    createZip: createZipTool,
    listPackages: listPackagesTool,
    ...(getProjectTools(projectId) ?? {}),
    ...getCommonTools(),
  } as Record<string, unknown>;

  const enabledToolEntries = getEnabledAgentToolCatalog({
    webSearchEnabled,
    projectId,
  });

  return guardToolSet(
    Object.fromEntries(
      enabledToolEntries.map((entry) => {
        const tool = toolImplementations[entry.name];

        if (!tool) {
          throw new Error(`Missing tool implementation for ${entry.name}`);
        }

        return [entry.name, tool];
      }),
    ),
  );
}
