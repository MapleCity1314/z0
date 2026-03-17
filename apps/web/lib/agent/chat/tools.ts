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
  const projectTools = getProjectTools(projectId);
  const commonTools = getCommonTools();

  return guardToolSet({
    ...(webSearchEnabled
      ? {
          tavilySearch: tavilySearchTool,
          tavilyExtract: tavilyExtractTool,
          tavilyCrawl: tavilyCrawlTool,
          tavilyMap: tavilyMapTool,
        }
      : {}),
    createArtifact: createArtifactTool,
    readArtifact: readArtifactTool,
    updateArtifact: updateArtifactTool,
    listArtifacts: listArtifactsTool,
    saveFile: saveFileTool,
    saveMultipleFiles: saveMultipleFilesTool,
    createZip: createZipTool,
    listPackages: listPackagesTool,
    ...(projectTools ?? {}),
    ...commonTools,
  });
}
