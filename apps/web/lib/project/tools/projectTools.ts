/**
 * 椤圭洰鎿嶄綔宸ュ叿闆?(C. Project File System)
 *
 * 杩欎簺宸ュ叿鍏佽 AI 瀵圭敤鎴风殑椤圭洰杩涜璇诲彇鍜屼慨鏀规搷浣?
 * 浠呭湪瀵硅瘽鍏宠仈浜嗛」鐩椂鍙敤锛坧rojectId 瀛樺湪锛?
 * 
 * 浣跨敤 WebContainer 瀹炵幇鏂囦欢绯荤粺鎿嶄綔
 *
 * 鍓嶇娓叉煋锛氶€氳繃 Tasks 缁勪欢灞曠ず鎵ц杩囩▼
 */

import { tool } from "ai";
import { z } from "zod";

// ============================================================================
// 杈呭姪鍑芥暟锛氫粠 messages 鎻愬彇 metadata
// ============================================================================

/**
 * 浠?context.messages 鎻愬彇 projectId
 * 
 * 鏈変袱绉嶆柟寮忚幏鍙?projectId锛?
 * 1. 閫氳繃宸ュ叿鍖呰鍣ㄦ敞鍏ワ細messages = { projectId: "xxx" }
 * 2. 閫氳繃宸ュ叿杈撳叆鍙傛暟锛歩nputProjectId
 * 
 * 浼樺厛浣跨敤杈撳叆鍙傛暟锛屽叾娆′娇鐢ㄥ寘瑁呭櫒娉ㄥ叆鐨勫€?
 */
function getProjectIdFromMessages(messages: unknown): string | undefined {
  // 鏂瑰紡1锛氫粠鍖呰鍣ㄦ敞鍏ョ殑瀵硅薄涓幏鍙?
  if (messages && typeof messages === 'object' && 'projectId' in messages) {
    const projectId = (messages as { projectId?: string }).projectId;
    if (projectId) {
      console.log('[getProjectIdFromMessages] Got projectId from wrapper:', projectId);
      return projectId;
    }
  }
  
  // 鏂瑰紡2锛氫粠娑堟伅鏁扮粍鐨?metadata 涓幏鍙栵紙鍏煎鏃ф柟寮忥級
  if (Array.isArray(messages) && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    const projectId = (lastMessage as any)?.metadata?.projectId as string | undefined;
    if (projectId) {
      console.log('[getProjectIdFromMessages] Got projectId from message metadata:', projectId);
      return projectId;
    }
  }
  
  console.log('[getProjectIdFromMessages] No projectId found');
  return undefined;
}



// ============================================================================
// 瀵煎叆 Server Actions锛堣礋璐ｈ璇佸拰鏁版嵁搴撴搷浣滐級
// ============================================================================

import {
  createProjectAction,
  listProjectsAction,
  getProjectInfoAction,
  updateProjectInfoAction,
  updateProjectFilesAction,
  deleteProjectFileAction,
} from "@/lib/project/db/project-actions";

// ============================================================================
// 椤圭洰妯℃澘
// ============================================================================

import { getTemplateFiles } from "@/lib/project/templates/template-registry";

// ============================================================================
// C1. 鏂囦欢璇诲彇宸ュ叿
// ============================================================================

/** 璇诲彇椤圭洰鏂囦欢鍒楄〃/鐩綍鏍?*/
export const readProjectFilesTool = tool({
  description:
    "List all files in the project or a specific directory. Returns file tree structure.",
  inputSchema: z.object({
    projectId: z
      .string()
      .optional()
      .describe("Project ID (optional, will use current conversation's project if not provided)"),
    path: z
      .string()
      .optional()
      .describe("Optional path to filter (e.g., 'src/' or 'components/')"),
    depth: z
      .number()
      .optional()
      .describe("Max depth to traverse (default: unlimited)"),
  }),
  execute: async ({ projectId: inputProjectId, path: filterPath, depth }, { messages }) => {
    const projectId = inputProjectId || getProjectIdFromMessages(messages);
    if (!projectId) {
      return {
        success: false,
        message: "No project associated with this conversation. Please provide projectId or open a project first.",
      };
    }
    
    try {
      // 浠庢暟鎹簱璇诲彇椤圭洰鏂囦欢锛堣€屼笉鏄?WebContainer锛?
      const result = await getProjectInfoAction(projectId);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          toolName: "readProjectFiles",
          message: result.error || "Failed to get project info",
        };
      }
      
      const files = (result.data.files as Record<string, string> | undefined) || {};
      let fileList = Object.keys(files);
      
      // 搴旂敤璺緞杩囨护
      if (filterPath) {
        fileList = fileList.filter(f => f.startsWith(filterPath));
      }
      
      // 搴旂敤娣卞害杩囨护
      if (depth !== undefined) {
        fileList = fileList.filter(f => {
          const pathDepth = f.split('/').length - 1;
          return pathDepth <= depth;
        });
      }
      
      return {
        success: true,
        toolName: "readProjectFiles",
        files: fileList,
        count: fileList.length,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "readProjectFiles",
        message: error instanceof Error ? error.message : "Failed to read project files",
      };
    }
  },
});

/** 璇诲彇鍗曚釜鏂囦欢鍐呭 */
export const getProjectFileTool = tool({
  description: "Get the content of a specific file in the project",
  inputSchema: z.object({
    projectId: z.string().optional().describe("Project ID (optional)"),
    filePath: z.string().describe("Path to the file (e.g., 'src/App.tsx')"),
  }),
  execute: async ({ projectId: inputProjectId, filePath }, { messages }) => {
    const projectId = inputProjectId || getProjectIdFromMessages(messages);
    if (!projectId) {
      return {
        success: false,
        message: "No project associated with this conversation. Please provide projectId.",
      };
    }
    
    try {
      // 浠庢暟鎹簱璇诲彇椤圭洰鏂囦欢
      const result = await getProjectInfoAction(projectId);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          toolName: "getProjectFile",
          message: result.error || "Failed to get project info",
        };
      }
      
      const files = (result.data.files as Record<string, string> | undefined) || {};
      const content = files[filePath];
      
      if (content === undefined) {
        return {
          success: false,
          toolName: "getProjectFile",
          message: `File not found: ${filePath}`,
        };
      }
      
      return {
        success: true,
        toolName: "getProjectFile",
        filePath,
        content,
        size: content.length,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "getProjectFile",
        message: error instanceof Error ? error.message : "Failed to read file",
      };
    }
  },
});

/** 妫€鏌ユ枃浠舵槸鍚﹀瓨鍦?*/
export const existsProjectFileTool = tool({
  description: "Check if a file exists in the project",
  inputSchema: z.object({
    filePath: z
      .string()
      .describe("Path to check (e.g., 'src/utils/helper.ts')"),
  }),
  execute: async ({ filePath }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return {
        success: false,
        message: "No project associated with this conversation",
      };
    }
    
    try {
      // 浠庢暟鎹簱璇诲彇椤圭洰鏂囦欢
      const result = await getProjectInfoAction(projectId);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          toolName: "existsProjectFile",
          message: result.error || "Failed to get project info",
        };
      }
      
      const files = (result.data.files as Record<string, string> | undefined) || {};
      const exists = filePath in files;
      
      return {
        success: true,
        toolName: "existsProjectFile",
        filePath,
        exists,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "existsProjectFile",
        message: error instanceof Error ? error.message : "Failed to check file",
      };
    }
  },
});

// ============================================================================
// C2. 鏂囦欢淇敼宸ュ叿
// ============================================================================

/** 鍒涘缓鏂版枃浠?*/
export const createProjectFileTool = tool({
  description: "Create a new file in the project",
  inputSchema: z.object({
    projectId: z.string().optional().describe("Project ID (optional)"),
    filePath: z
      .string()
      .describe("Path for the new file (e.g., 'src/components/Button.tsx')"),
    content: z.string().describe("Content for the new file"),
  }),
  execute: async ({ projectId: inputProjectId, filePath, content }, { messages }) => {
    const projectId = inputProjectId || getProjectIdFromMessages(messages);
    if (!projectId) {
      return {
        success: false,
        message: "No project associated with this conversation. Please provide projectId.",
      };
    }
    
    try {
      // 闇€瑕佸垱寤轰竴涓柊鐨?Server Action 鏉ユ洿鏂版枃浠?
      const result = await updateProjectFilesAction(projectId, {
        [filePath]: content,
      });
      
      if (!result.success) {
        return {
          success: false,
          toolName: "createProjectFile",
          message: result.error || "Failed to create file",
        };
      }
      
      return {
        success: true,
        toolName: "createProjectFile",
        filePath,
        message: `Created file: ${filePath}`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "createProjectFile",
        message: error instanceof Error ? error.message : "Failed to create file",
      };
    }
  },
});

/** 鏇存柊/瑕嗙洊鏂囦欢 */
export const updateProjectFileTool = tool({
  description: "Update or overwrite a file in the project",
  inputSchema: z.object({
    projectId: z.string().optional().describe("Project ID (optional)"),
    filePath: z.string().describe("Path to the file (e.g., 'src/App.tsx')"),
    content: z.string().describe("New content for the file"),
    createIfNotExists: z
      .boolean()
      .optional()
      .describe("Create if not exists (default: true)"),
  }),
  execute: async ({ projectId: inputProjectId, filePath, content, createIfNotExists = true }, { messages }) => {
    const projectId = inputProjectId || getProjectIdFromMessages(messages);
    if (!projectId) {
      return {
        success: false,
        message: "No project associated with this conversation. Please provide projectId.",
      };
    }
    
    try {
      // 妫€鏌ユ枃浠舵槸鍚﹀瓨鍦?
      if (!createIfNotExists) {
        const infoResult = await getProjectInfoAction(projectId);
        if (!infoResult.success || !infoResult.data) {
          return {
            success: false,
            toolName: "updateProjectFile",
            message: "Failed to check file existence",
          };
        }
        
        const files = (infoResult.data.files as Record<string, string> | undefined) || {};
        if (!(filePath in files)) {
          return {
            success: false,
            toolName: "updateProjectFile",
            message: `File not found: ${filePath}`,
          };
        }
      }
      
      // 鏇存柊鏂囦欢
      const result = await updateProjectFilesAction(projectId, {
        [filePath]: content,
      });
      
      if (!result.success) {
        return {
          success: false,
          toolName: "updateProjectFile",
          message: result.error || "Failed to update file",
        };
      }
      
      return {
        success: true,
        toolName: "updateProjectFile",
        filePath,
        message: `Updated file: ${filePath}`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "updateProjectFile",
        message: error instanceof Error ? error.message : "Failed to update file",
      };
    }
  },
});

/** 鍩轰簬 diff 淇敼鏂囦欢 (鎺ㄨ崘) */
export const patchProjectFileTool = tool({
  description: "Apply a patch/diff to a file. Safer than full overwrite.",
  inputSchema: z.object({
    filePath: z.string().describe("Path to the file"),
    patch: z.string().describe("Unified diff format patch to apply"),
  }),
  execute: async ({ filePath, patch: _patch }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return {
        success: false,
        message: "No project associated with this conversation",
      };
    }
    // TODO: 瀹炵幇 diff patch 搴旂敤閫昏緫
    return {
      success: false,
      toolName: "patchProjectFile",
      message: `Patch tool not fully implemented yet for: ${filePath}`,
    };
  },
});

/** 鍒犻櫎鏂囦欢 */
export const deleteProjectFileTool = tool({
  description: "Delete a file from the project",
  inputSchema: z.object({
    filePath: z.string().describe("Path to the file to delete"),
  }),
  execute: async ({ filePath }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return {
        success: false,
        message: "No project associated with this conversation",
      };
    }
    
    try {
      const result = await deleteProjectFileAction(projectId, filePath);
      
      if (!result.success) {
        return {
          success: false,
          toolName: "deleteProjectFile",
          message: result.error || "Failed to delete file",
        };
      }
      
      return {
        success: true,
        toolName: "deleteProjectFile",
        filePath,
        message: `Deleted: ${filePath}`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "deleteProjectFile",
        message: error instanceof Error ? error.message : "Failed to delete file",
      };
    }
  },
});

// ============================================================================
// C3. 椤圭洰鍏冧俊鎭伐鍏?
// ============================================================================

/** 鑾峰彇椤圭洰淇℃伅 */
export const getProjectInfoTool = tool({
  description: "Get project metadata (name, type, status, structure, etc.)",
  inputSchema: z.object({
    projectId: z.string().optional().describe("Project ID (optional)"),
  }),
  execute: async ({ projectId: inputProjectId }, { messages }) => {
    const projectId = inputProjectId || getProjectIdFromMessages(messages);
    console.log('[Tool] getProjectInfo - projectId:', projectId);
    
    if (!projectId) {
      return {
        success: false,
        message: "No project associated with this conversation. Please provide projectId.",
      };
    }
    
    // 璋冪敤 Server Action锛堣礋璐ｈ璇佸拰鏁版嵁搴撴煡璇級
    const result = await getProjectInfoAction(projectId);
    
    if (!result.success || !result.data) {
      return {
        success: false,
        toolName: "getProjectInfo",
        message: result.error || "Failed to get project info",
      };
    }
    
    // 杩斿洖椤圭洰淇℃伅锛堝寘鍚枃浠跺垪琛級
    const files = (result.data.files as Record<string, string> | undefined) || {};
    const fileList = Object.keys(files);
    
    return {
      success: true,
      toolName: "getProjectInfo",
      ...result.data,
      fileCount: fileList.length,
      files: fileList.slice(0, 20), // 鍙繑鍥炲墠 20 涓枃浠跺悕
      message: fileList.length > 20 
        ? `Project has ${fileList.length} files (showing first 20)`
        : `Project has ${fileList.length} files`,
    };
  },
});

/** 鏇存柊椤圭洰淇℃伅 */
export const updateProjectInfoTool = tool({
  description: "Update project metadata (name, description, tags, etc.)",
  inputSchema: z.object({
    name: z.string().optional().describe("New project name"),
    description: z.string().optional().describe("New description"),
    tags: z.array(z.string()).optional().describe("New tags"),
  }),
  execute: async ({ name, description, tags }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return {
        success: false,
        message: "No project associated with this conversation",
      };
    }
    
    // 璋冪敤 Server Action锛堣礋璐ｈ璇佸拰鏁版嵁搴撴洿鏂帮級
    const result = await updateProjectInfoAction(projectId, {
      name,
      description,
      tags,
    });
    
    if (!result.success || !result.data) {
      return {
        success: false,
        toolName: "updateProjectInfo",
        message: result.error || "Failed to update project info",
      };
    }
    
    return {
      success: true,
      toolName: "updateProjectInfo",
      ...result.data,
      message: "Project info updated successfully",
    };
  },
});

// ============================================================================
// C4. 椤圭洰绠＄悊宸ュ叿
// ============================================================================

/** 鍒涘缓鏂伴」鐩?*/
export const createProjectTool = tool({
  description: "Create a new project from template",
  inputSchema: z.object({
    name: z.string().describe("Project name"),
    type: z
      .enum(["react", "vue", "nextjs", "vanilla"])
      .describe("Project type/template"),
    description: z.string().optional().describe("Project description"),
  }),
  execute: async ({ name, type, description }) => {
    try {
      // Get template files based on type
      const templateFiles = getTemplateFiles(type);
      
      // 璋冪敤 Server Action锛堣礋璐ｈ璇佸拰鏁版嵁搴撳垱寤猴級
      // 娉ㄦ剰锛氭枃浠朵繚瀛樺埌鏁版嵁搴撶殑 files 瀛楁
      // WebContainer 鍒濆鍖栧皢鍦ㄥ鎴风 ProjectPanel 涓繘琛?
      const result = await createProjectAction({
        name,
        type,
        description,
        files: templateFiles,
      });
      
      if (!result.success || !result.data) {
        return {
          success: false,
          toolName: "createProject",
          message: result.error || "Failed to create project",
        };
      }
      
      return {
        success: true,
        toolName: "createProject",
        projectId: result.data.projectId,
        name: result.data.name,
        type: result.data.type,
        fileCount: Object.keys(templateFiles).length,
        openProjectUrl: `/?projectId=${result.data.projectId}`,
        message: `Created ${type} project: ${name} with ${Object.keys(templateFiles).length} files. [Open Project](/?projectId=${result.data.projectId})\n\n**Important**: To work with this project, use projectId="${result.data.projectId}" in subsequent tool calls, or ask the user to click the "Open Project" link above.`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "createProject",
        message: error instanceof Error ? error.message : "Failed to create project",
      };
    }
  },
});

/** 鍒楀嚭鐢ㄦ埛椤圭洰 */
export const listProjectsTool = tool({
  description: "List all projects owned by the user. Returns project IDs that can be used in other project tools.",
  inputSchema: z.object({
    status: z
      .enum(["all", "draft", "building", "deployed"])
      .optional()
      .describe("Filter by status"),
  }),
  execute: async ({ status }) => {
    try {
      // 璋冪敤 Server Action锛堣礋璐ｈ璇佸拰鏁版嵁搴撴煡璇級
      const result = await listProjectsAction({ status });
      
      if (!result.success || !result.data) {
        return {
          success: false,
          toolName: "listProjects",
          message: result.error || "Failed to list projects",
        };
      }
      
      return {
        success: true,
        toolName: "listProjects",
        ...result.data,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "listProjects",
        message: error instanceof Error ? error.message : "Failed to list projects",
      };
    }
  },
});

