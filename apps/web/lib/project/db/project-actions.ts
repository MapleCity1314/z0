/**
 * Project Server Actions
 * 
 * 这些 Server Actions 负责：
 * 1. 用户认证（使用 NextAuth session）
 * 2. 数据库操作
 * 3. 权限验证
 * 
 * 工具通过调用这些 Server Actions 来执行需要认证的操作
 */

"use server";

import { requireAuth } from "@/lib/session";
import { 
  createProject as dbCreateProject,
  getProjectsByUserId,
  getProjectById,
  updateProjectMetadata as dbUpdateProjectMetadata,
  updateProjectFiles,
} from "./project-queries";

/**
 * 创建新项目
 * 需要用户认证
 */
export async function createProjectAction(params: {
  name: string;
  type: "react" | "vue" | "nextjs" | "vanilla";
  description?: string;
  files: Record<string, string>;
}) {
  try {
    const user = await requireAuth();
    
    const project = await dbCreateProject({
      userId: user.id,
      name: params.name,
      description: params.description,
      type: params.type,
      files: params.files,
    });
    
    return {
      success: true,
      data: {
        projectId: project.id,
        name: project.name,
        type: project.type,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

/**
 * 获取用户的所有项目
 * 需要用户认证
 */
export async function listProjectsAction(params?: {
  status?: "all" | "draft" | "building" | "deployed";
}) {
  try {
    const user = await requireAuth();
    
    let projects = await getProjectsByUserId(user.id);
    
    // 按状态过滤
    if (params?.status && params.status !== "all") {
      projects = projects.filter((p) => p.status === params.status);
    }
    
    return {
      success: true,
      data: {
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          description: p.description,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        count: projects.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list projects",
    };
  }
}

/**
 * 获取项目信息
 * 需要用户认证 + 项目所有权验证
 */
export async function getProjectInfoAction(projectId: string) {
  try {
    const user = await requireAuth();
    
    const project = await getProjectById(projectId);
    
    if (!project) {
      return {
        success: false,
        error: "Project not found",
      };
    }
    
    // 验证用户是否拥有该项目
    if (project.userId !== user.id) {
      return {
        success: false,
        error: "Forbidden: You don't own this project",
      };
    }
    
    return {
      success: true,
      data: {
        projectId: project.id,
        name: project.name,
        type: project.type,
        status: project.status,
        description: project.description,
        tags: project.tags,
        files: project.files as Record<string, string> | undefined,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get project info",
    };
  }
}

/**
 * 更新项目元信息
 * 需要用户认证 + 项目所有权验证
 */
export async function updateProjectInfoAction(
  projectId: string,
  updates: {
    name?: string;
    description?: string;
    tags?: string[];
  }
) {
  try {
    const user = await requireAuth();
    
    const project = await getProjectById(projectId);
    
    if (!project) {
      return {
        success: false,
        error: "Project not found",
      };
    }
    
    // 验证用户是否拥有该项目
    if (project.userId !== user.id) {
      return {
        success: false,
        error: "Forbidden: You don't own this project",
      };
    }
    
    const updated = await dbUpdateProjectMetadata(projectId, updates);
    
    if (!updated) {
      return {
        success: false,
        error: "Failed to update project",
      };
    }
    
    return {
      success: true,
      data: {
        projectId: updated.id,
        name: updated.name,
        description: updated.description,
        tags: updated.tags,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update project info",
    };
  }
}

/**
 * 验证用户是否拥有项目
 * 这是一个通用的验证函数，供其他 actions 使用
 */
export async function verifyProjectOwnership(projectId: string) {
  try {
    const user = await requireAuth();
    const project = await getProjectById(projectId);
    
    if (!project) {
      return { success: false, error: "Project not found" };
    }
    
    if (project.userId !== user.id) {
      return { success: false, error: "Forbidden: You don't own this project" };
    }
    
    return { success: true, userId: user.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * 更新项目文件
 * 需要用户认证 + 项目所有权验证
 */
export async function updateProjectFilesAction(
  projectId: string,
  newFiles: Record<string, string>
) {
  try {
    const user = await requireAuth();
    
    const project = await getProjectById(projectId);
    
    if (!project) {
      return {
        success: false,
        error: "Project not found",
      };
    }
    
    // 验证用户是否拥有该项目
    if (project.userId !== user.id) {
      return {
        success: false,
        error: "Forbidden: You don't own this project",
      };
    }
    
    // 合并现有文件和新文件
    const existingFiles = (project.files as Record<string, string>) || {};
    const updatedFiles = { ...existingFiles, ...newFiles };
    
    const updated = await updateProjectFiles(projectId, updatedFiles);
    
    if (!updated) {
      return {
        success: false,
        error: "Failed to update files",
      };
    }
    
    return {
      success: true,
      data: {
        projectId: updated.id,
        filesUpdated: Object.keys(newFiles).length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update files",
    };
  }
}

/**
 * 删除项目文件
 * 需要用户认证 + 项目所有权验证
 */
export async function deleteProjectFileAction(
  projectId: string,
  filePath: string
) {
  try {
    const user = await requireAuth();
    
    const project = await getProjectById(projectId);
    
    if (!project) {
      return {
        success: false,
        error: "Project not found",
      };
    }
    
    // 验证用户是否拥有该项目
    if (project.userId !== user.id) {
      return {
        success: false,
        error: "Forbidden: You don't own this project",
      };
    }
    
    // 从文件列表中删除指定文件
    const existingFiles = (project.files as Record<string, string>) || {};
    const { [filePath]: _, ...remainingFiles } = existingFiles;
    
    const updated = await updateProjectFiles(projectId, remainingFiles);
    
    if (!updated) {
      return {
        success: false,
        error: "Failed to delete file",
      };
    }
    
    return {
      success: true,
      data: {
        projectId: updated.id,
        deletedFile: filePath,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete file",
    };
  }
}
