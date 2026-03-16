/**
 * 运行时 Debug 采集工具 (G. Runtime Observability Tools)
 * 
 * 使用 WebContainer 实现日志和网络请求监控
 * 
 * 前端渲染：通过 Tasks 组件展示执行过程
 */

import { tool } from "ai";
import { z } from "zod";
import { getWebContainerManager } from "@/lib/project/web-container-builder";

/** 获取控制台日志 */
export const getConsoleLogsTool = tool({
  description: "Get console logs from the preview",
  inputSchema: z.object({
    level: z.enum(["all", "log", "warn", "error"]).optional().describe("Filter by log level"),
    limit: z.number().optional().describe("Max number of logs (default: 50)"),
  }),
  execute: async ({ level = "all", limit = 50 }, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const logs = manager.getConsoleLogs(projectId, level, limit);
      return {
        success: true,
        toolName: "getConsoleLogs",
        level,
        count: logs.length,
        logs,
        message: `Retrieved ${logs.length} log entries`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "getConsoleLogs",
        message: error instanceof Error ? error.message : "Failed to get console logs",
      };
    }
  },
});

/** 清空控制台日志 */
export const clearConsoleLogsTool = tool({
  description: "Clear console logs buffer",
  inputSchema: z.object({}),
  execute: async (_input, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      manager.clearConsoleLogs(projectId);
      return {
        success: true,
        toolName: "clearConsoleLogs",
        message: "Console logs cleared",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "clearConsoleLogs",
        message: error instanceof Error ? error.message : "Failed to clear console logs",
      };
    }
  },
});

/** 获取网络请求记录 */
export const getNetworkRequestsTool = tool({
  description: "Get recent fetch/xhr requests from the preview",
  inputSchema: z.object({
    limit: z.number().optional().describe("Max number of requests (default: 20)"),
    filter: z.string().optional().describe("Filter by URL pattern"),
  }),
  execute: async ({ limit = 20, filter }, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const requests = manager.getNetworkRequests(projectId, limit, filter);
      return {
        success: true,
        toolName: "getNetworkRequests",
        count: requests.length,
        filter,
        requests,
        message: `Retrieved ${requests.length} network requests`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "getNetworkRequests",
        message: error instanceof Error ? error.message : "Failed to get network requests",
      };
    }
  },
});

/** 清空网络请求记录 */
export const clearNetworkRequestsTool = tool({
  description: "Clear network requests buffer",
  inputSchema: z.object({}),
  execute: async (_input, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      manager.clearNetworkRequests(projectId);
      return {
        success: true,
        toolName: "clearNetworkRequests",
        message: "Network requests cleared",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "clearNetworkRequests",
        message: error instanceof Error ? error.message : "Failed to clear network requests",
      };
    }
  },
});

/** 获取性能指标 */
export const getPerformanceMetricsTool = tool({
  description: "Get page load performance metrics",
  inputSchema: z.object({}),
  execute: async (_input, { messages }) => {
    const projectId = (messages as { projectId?: string }).projectId;
    if (!projectId) {
      return { success: false, message: "No project associated with this conversation" };
    }
    
    try {
      const manager = getWebContainerManager();
      const stats = manager.getInstanceStats(projectId);
      
      if (!stats) {
        return {
          success: false,
          toolName: "getPerformanceMetrics",
          message: "No WebContainer instance found",
        };
      }
      
      return {
        success: true,
        toolName: "getPerformanceMetrics",
        metrics: {
          uptime: stats.uptime,
          reuseCount: stats.reuseCount,
          cacheSize: stats.cacheSize,
          logCount: stats.logCount,
          requestCount: stats.requestCount,
        },
        message: `Instance uptime: ${Math.round(stats.uptime / 1000)}s`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "getPerformanceMetrics",
        message: error instanceof Error ? error.message : "Failed to get performance metrics",
      };
    }
  },
});
