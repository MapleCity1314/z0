/**
 * 运行与预览工具 (E. Runtime & Proxy Tools)
 * 
 * 用于 v0 风格的实时预览
 * 使用 WebContainer 实现开发服务器管理
 * 
 * 前端渲染：通过 Tasks 组件展示执行过程
 */

import { tool } from "ai";
import { z } from "zod";
import { getWebContainerManager } from "@/lib/project/web-container-builder";

/** 启动开发服务器 */
export const startDevServerTool = tool({
  description: "Start development server (Next.js dev, Vite dev, etc.)",
  inputSchema: z.object({
    port: z.number().optional().describe("Port number (default: 3000)"),
  }),
  execute: async ({ port = 3000 }, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const result = await manager.startDevServer(projectId, port);
      return {
        success: true,
        toolName: "startDevServer",
        url: result.url,
        port: result.port,
        message: `Dev server started at ${result.url}`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "startDevServer",
        message: error instanceof Error ? error.message : "Failed to start dev server",
      };
    }
  },
});

/** 启动预览服务器 */
export const startPreviewServerTool = tool({
  description: "Start production preview server",
  inputSchema: z.object({
    port: z.number().optional().describe("Port number (default: 3000)"),
  }),
  execute: async ({ port = 3000 }, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const result = await manager.startPreviewServer(projectId, port);
      return {
        success: true,
        toolName: "startPreviewServer",
        url: result.url,
        port: result.port,
        message: `Preview server started at ${result.url}`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "startPreviewServer",
        message: error instanceof Error ? error.message : "Failed to start preview server",
      };
    }
  },
});

/** 停止服务器 */
export const stopServerTool = tool({
  description: "Stop the running dev/preview server",
  inputSchema: z.object({}),
  execute: async (_input, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      await manager.stopServer(projectId);
      return {
        success: true,
        toolName: "stopServer",
        message: "Server stopped",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "stopServer",
        message: error instanceof Error ? error.message : "Failed to stop server",
      };
    }
  },
});

/** 代理请求到开发服务器 */
export const proxyRequestToDevServerTool = tool({
  description: "Proxy a request to the dev server (core capability for preview)",
  inputSchema: z.object({
    path: z.string().describe("Request path (e.g., '/', '/api/users')"),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional().describe("HTTP method"),
  }),
  execute: async ({ path, method = "GET" }, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const serverStatus = manager.getServerStatus(projectId);
      
      if (!serverStatus.running || !serverStatus.url) {
        return {
          success: false,
          toolName: "proxyRequestToDevServer",
          message: "No server running. Start dev server first.",
        };
      }
      
      // 返回代理信息，实际代理由前端 iframe 处理
      return {
        success: true,
        toolName: "proxyRequestToDevServer",
        serverUrl: serverStatus.url,
        path,
        method,
        fullUrl: `${serverStatus.url}${path}`,
        message: `Proxy ready: ${method} ${path}`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "proxyRequestToDevServer",
        message: error instanceof Error ? error.message : "Failed to proxy request",
      };
    }
  },
});

/** 获取服务器状态 */
export const getServerStatusTool = tool({
  description: "Get current dev/preview server status",
  inputSchema: z.object({}),
  execute: async (_input, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const status = manager.getServerStatus(projectId);
      return {
        success: true,
        toolName: "getServerStatus",
        running: status.running,
        url: status.url,
        port: status.port,
        message: status.running 
          ? `Server running at ${status.url}` 
          : "No server running",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "getServerStatus",
        message: error instanceof Error ? error.message : "Failed to get server status",
      };
    }
  },
});
