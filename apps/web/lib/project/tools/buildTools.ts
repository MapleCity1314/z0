/**
 * 依赖安装、构建系统工具 (D. Build & Dependency Tools)
 * 
 * 使用 WebContainer 实现依赖管理和构建操作
 * 
 * 前端渲染：通过 Tasks 组件展示执行过程
 */

import { tool } from "ai";
import { z } from "zod";
import { getWebContainerManager } from "@/lib/project/web-container-builder";

/** 添加依赖 */
export const addDependencyTool = tool({
  description: "Install npm/pnpm/bun dependency to the project",
  inputSchema: z.object({
    packages: z.array(z.string()).describe("Package names to install (e.g., ['react', 'lodash'])"),
    dev: z.boolean().optional().describe("Install as devDependency (default: false)"),
  }),
  execute: async ({ packages, dev = false }, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const result = await manager.addDependency(projectId, packages, dev);
      return {
        success: result.exitCode === 0,
        toolName: "addDependency",
        packages,
        dev,
        exitCode: result.exitCode,
        output: result.output,
        message: result.exitCode === 0 
          ? `Installed: ${packages.join(", ")}` 
          : `Failed to install packages`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "addDependency",
        message: error instanceof Error ? error.message : "Failed to add dependency",
      };
    }
  },
});

/** 移除依赖 */
export const removeDependencyTool = tool({
  description: "Remove a dependency from the project",
  inputSchema: z.object({
    packages: z.array(z.string()).describe("Package names to remove"),
  }),
  execute: async ({ packages }, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const result = await manager.removeDependency(projectId, packages);
      return {
        success: result.exitCode === 0,
        toolName: "removeDependency",
        packages,
        exitCode: result.exitCode,
        output: result.output,
        message: result.exitCode === 0 
          ? `Removed: ${packages.join(", ")}` 
          : `Failed to remove packages`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "removeDependency",
        message: error instanceof Error ? error.message : "Failed to remove dependency",
      };
    }
  },
});

/** 安装所有依赖 */
export const installDependenciesTool = tool({
  description: "Run npm/pnpm install to install all dependencies",
  inputSchema: z.object({}),
  execute: async (_input, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const result = await manager.installDependencies(projectId);
      return {
        success: result.exitCode === 0,
        toolName: "installDependencies",
        exitCode: result.exitCode,
        output: result.output,
        message: result.exitCode === 0 
          ? "Dependencies installed successfully" 
          : "Failed to install dependencies",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "installDependencies",
        message: error instanceof Error ? error.message : "Failed to install dependencies",
      };
    }
  },
});

/** 运行构建 */
export const runBuildTool = tool({
  description: "Run build command (next build / vite build)",
  inputSchema: z.object({
    mode: z.enum(["production", "development"]).optional().describe("Build mode"),
  }),
  execute: async ({ mode }, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const result = await manager.runBuild(projectId, mode);
      return {
        success: result.exitCode === 0,
        toolName: "runBuild",
        mode,
        exitCode: result.exitCode,
        output: result.output,
        message: result.exitCode === 0 
          ? "Build completed successfully" 
          : "Build failed",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "runBuild",
        message: error instanceof Error ? error.message : "Failed to run build",
      };
    }
  },
});

/** 运行 lint */
export const runLintTool = tool({
  description: "Run linter (biome/eslint) on the project",
  inputSchema: z.object({
    fix: z.boolean().optional().describe("Auto-fix issues (default: false)"),
    path: z.string().optional().describe("Specific path to lint"),
  }),
  execute: async ({ fix = false, path }, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const result = await manager.runLint(projectId, fix, path);
      return {
        success: result.exitCode === 0,
        toolName: "runLint",
        fix,
        path,
        exitCode: result.exitCode,
        output: result.output,
        message: result.exitCode === 0 
          ? "Lint passed" 
          : "Lint found issues",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "runLint",
        message: error instanceof Error ? error.message : "Failed to run lint",
      };
    }
  },
});

/** 运行格式化 */
export const runFormatTool = tool({
  description: "Run formatter (prettier/biome) on the project",
  inputSchema: z.object({
    path: z.string().optional().describe("Specific path to format"),
  }),
  execute: async ({ path }, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const result = await manager.runFormat(projectId, path);
      return {
        success: result.exitCode === 0,
        toolName: "runFormat",
        path,
        exitCode: result.exitCode,
        output: result.output,
        message: result.exitCode === 0 
          ? "Format completed" 
          : "Format failed",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "runFormat",
        message: error instanceof Error ? error.message : "Failed to run format",
      };
    }
  },
});

/** 运行脚本 */
export const runScriptTool = tool({
  description: "Run a script from package.json",
  inputSchema: z.object({
    script: z.string().describe("Script name (e.g., 'test', 'dev', 'build')"),
    args: z.array(z.string()).optional().describe("Additional arguments"),
  }),
  execute: async ({ script, args = [] }, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const result = await manager.runScript(projectId, script, args);
      return {
        success: result.exitCode === 0,
        toolName: "runScript",
        script,
        args,
        exitCode: result.exitCode,
        output: result.output,
        message: result.exitCode === 0 
          ? `Script '${script}' completed` 
          : `Script '${script}' failed`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "runScript",
        message: error instanceof Error ? error.message : "Failed to run script",
      };
    }
  },
});
