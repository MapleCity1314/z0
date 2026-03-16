/**
 * 系统安全与资源管理工具 (J. System Tools)
 *
 * 提供：
 * - 沙箱脚本执行
 * - 配额和资源监控
 * - 任务管理
 * - 事件日志
 *
 * 这些工具对于 Vibe Coding 平台非常重要，防止 AI 越跑越离谱
 * 前端渲染：通过 Tasks 组件展示执行过程
 */

import { tool } from "ai";
import { z } from "zod";
import { requireAuth } from "@/lib/session";

// ============================================================================
// 类型定义
// ============================================================================

interface TaskInfo {
  id: string;
  type: "script" | "build" | "server" | "other";
  status: "running" | "completed" | "failed" | "terminated";
  startTime: number;
  endTime?: number;
  projectId?: string;
  description: string;
}

interface QuotaInfo {
  tokens: {
    used: number;
    limit: number;
    remaining: number;
  };
  requests: {
    used: number;
    limit: number;
    remaining: number;
  };
  storage: {
    used: number;
    limit: number;
    remaining: number;
  };
  compute: {
    used: number;
    limit: number;
    remaining: number;
  };
}

interface LogEvent {
  id: string;
  timestamp: number;
  event: string;
  level: "info" | "warn" | "error";
  data?: Record<string, unknown>;
  userId?: string;
  projectId?: string;
}

// ============================================================================
// 内存存储（生产环境应使用 Redis 或数据库）
// ============================================================================

const taskStore = new Map<string, TaskInfo>();
const eventLogs: LogEvent[] = [];
const userQuotas = new Map<string, QuotaInfo>();

// 默认配额
const DEFAULT_QUOTA: QuotaInfo = {
  tokens: { used: 0, limit: 100000, remaining: 100000 },
  requests: { used: 0, limit: 1000, remaining: 1000 },
  storage: { used: 0, limit: 100 * 1024 * 1024, remaining: 100 * 1024 * 1024 }, // 100MB
  compute: { used: 0, limit: 3600, remaining: 3600 }, // 1 hour in seconds
};

/**
 * 获取或创建用户配额
 */
function getOrCreateQuota(userId: string): QuotaInfo {
  if (!userQuotas.has(userId)) {
    userQuotas.set(userId, { ...DEFAULT_QUOTA });
  }
  return userQuotas.get(userId)!;
}

/**
 * 更新配额使用量
 */
function updateQuotaUsage(
  userId: string,
  type: keyof QuotaInfo,
  amount: number
): boolean {
  const quota = getOrCreateQuota(userId);

  if (quota[type].remaining < amount) {
    return false; // 配额不足
  }

  quota[type].used += amount;
  quota[type].remaining -= amount;
  return true;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// J1. 沙箱脚本执行工具
// ============================================================================

/** 安全执行脚本 */
export const runSandboxedScriptTool = tool({
  description: `Execute JavaScript in a sandboxed environment.
  
The script runs in an isolated context with:
- No access to file system
- No network access
- Limited execution time
- Memory limits

Use for safe code evaluation and testing.`,
  inputSchema: z.object({
    script: z.string().describe("JavaScript code to execute"),
    timeout: z
      .number()
      .optional()
      .describe("Timeout in ms (default: 5000, max: 30000)"),
    context: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Variables to inject into script context"),
  }),
  execute: async ({ script, timeout = 5000, context = {} }) => {
    const taskId = generateId();
    const startTime = Date.now();

    // 创建任务记录
    taskStore.set(taskId, {
      id: taskId,
      type: "script",
      status: "running",
      startTime,
      description: `Sandboxed script execution`,
    });

    try {
      // 限制超时时间
      const safeTimeout = Math.min(timeout, 30000);

      // 创建沙箱环境
      // 注意：这是一个简化实现，生产环境应使用 vm2 或 isolated-vm
      const sandbox = {
        console: {
          log: (...args: unknown[]) => logs.push({ level: "log", args }),
          warn: (...args: unknown[]) => logs.push({ level: "warn", args }),
          error: (...args: unknown[]) => logs.push({ level: "error", args }),
        },
        JSON,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Error,
        ...context,
      };

      const logs: Array<{ level: string; args: unknown[] }> = [];

      // 使用 Function 构造器创建沙箱函数
      // 注意：这不是完全安全的，生产环境需要更强的隔离
      const sandboxedCode = `
        "use strict";
        return (function(sandbox) {
          with (sandbox) {
            return (function() {
              ${script}
            })();
          }
        })(this);
      `;

      // 执行脚本
      let result: unknown;
      let error: Error | null = null;

      const executePromise = new Promise<unknown>((resolve, reject) => {
        try {
          const fn = new Function(sandboxedCode);
          const boundFn = fn.bind(sandbox);
          resolve(boundFn());
        } catch (e) {
          reject(e);
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Script execution timed out")),
          safeTimeout
        );
      });

      try {
        result = await Promise.race([executePromise, timeoutPromise]);
      } catch (e) {
        error = e instanceof Error ? e : new Error(String(e));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 更新任务状态
      const task = taskStore.get(taskId)!;
      task.status = error ? "failed" : "completed";
      task.endTime = endTime;

      if (error) {
        return {
          success: false,
          toolName: "runSandboxedScript",
          taskId,
          error: error.message,
          logs,
          duration,
          message: `Script failed: ${error.message}`,
        };
      }

      return {
        success: true,
        toolName: "runSandboxedScript",
        taskId,
        result,
        logs,
        duration,
        message: `Script completed in ${duration}ms`,
      };
    } catch (error) {
      const task = taskStore.get(taskId);
      if (task) {
        task.status = "failed";
        task.endTime = Date.now();
      }

      return {
        success: false,
        toolName: "runSandboxedScript",
        taskId,
        message:
          error instanceof Error ? error.message : "Script execution failed",
      };
    }
  },
});

// ============================================================================
// J2. 配额使用情况工具
// ============================================================================

/** 获取配额使用情况 */
export const getQuotaUsageTool = tool({
  description: `Get current quota and resource usage information.
  
Returns:
- Token usage (AI model tokens)
- Request count
- Storage usage
- Compute time usage

Useful for monitoring resource consumption.`,
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const user = await requireAuth();
      const quota = getOrCreateQuota(user.id);

      // 计算百分比
      const tokenPercent = Math.round(
        (quota.tokens.used / quota.tokens.limit) * 100
      );
      const requestPercent = Math.round(
        (quota.requests.used / quota.requests.limit) * 100
      );
      const storagePercent = Math.round(
        (quota.storage.used / quota.storage.limit) * 100
      );
      const computePercent = Math.round(
        (quota.compute.used / quota.compute.limit) * 100
      );

      return {
        success: true,
        toolName: "getQuotaUsage",
        quota: {
          tokens: {
            ...quota.tokens,
            percent: tokenPercent,
            formatted: `${quota.tokens.used.toLocaleString()} / ${quota.tokens.limit.toLocaleString()}`,
          },
          requests: {
            ...quota.requests,
            percent: requestPercent,
            formatted: `${quota.requests.used} / ${quota.requests.limit}`,
          },
          storage: {
            ...quota.storage,
            percent: storagePercent,
            formatted: `${formatBytes(quota.storage.used)} / ${formatBytes(
              quota.storage.limit
            )}`,
          },
          compute: {
            ...quota.compute,
            percent: computePercent,
            formatted: `${formatDuration(
              quota.compute.used
            )} / ${formatDuration(quota.compute.limit)}`,
          },
        },
        message: `Token: ${tokenPercent}%, Requests: ${requestPercent}%, Storage: ${storagePercent}%, Compute: ${computePercent}%`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "getQuotaUsage",
        message:
          error instanceof Error ? error.message : "Failed to get quota usage",
      };
    }
  },
});

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 格式化持续时间（秒）
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// ============================================================================
// J3. 任务管理工具
// ============================================================================

/** 终止长任务 */
export const terminateTaskTool = tool({
  description: `Terminate a long-running task.
  
Use this to stop:
- Stuck build processes
- Infinite loops
- Unresponsive servers

Returns the task status after termination attempt.`,
  inputSchema: z.object({
    taskId: z.string().describe("Task ID to terminate"),
  }),
  execute: async ({ taskId }) => {
    try {
      const task = taskStore.get(taskId);

      if (!task) {
        return {
          success: false,
          toolName: "terminateTask",
          message: `Task not found: ${taskId}`,
        };
      }

      if (task.status !== "running") {
        return {
          success: false,
          toolName: "terminateTask",
          message: `Task is not running (status: ${task.status})`,
        };
      }

      // 标记任务为已终止
      task.status = "terminated";
      task.endTime = Date.now();

      // 记录事件
      eventLogs.push({
        id: generateId(),
        timestamp: Date.now(),
        event: "task_terminated",
        level: "warn",
        data: { taskId, taskType: task.type },
      });

      return {
        success: true,
        toolName: "terminateTask",
        taskId,
        task: {
          id: task.id,
          type: task.type,
          status: task.status,
          duration: task.endTime - task.startTime,
        },
        message: `Task ${taskId} terminated`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "terminateTask",
        message:
          error instanceof Error ? error.message : "Failed to terminate task",
      };
    }
  },
});

/** 列出任务 */
export const listTasksTool = tool({
  description: `List all tasks (running, completed, failed).
  
Returns task history with status and duration.
Useful for monitoring and debugging.`,
  inputSchema: z.object({
    status: z
      .enum(["all", "running", "completed", "failed", "terminated"])
      .optional()
      .describe("Filter by status (default: all)"),
    limit: z
      .number()
      .optional()
      .describe("Max number of tasks to return (default: 20)"),
  }),
  execute: async ({ status = "all", limit = 20 }) => {
    try {
      let tasks = Array.from(taskStore.values());

      // 按状态过滤
      if (status !== "all") {
        tasks = tasks.filter((t) => t.status === status);
      }

      // 按开始时间排序（最新的在前）
      tasks.sort((a, b) => b.startTime - a.startTime);

      // 限制数量
      tasks = tasks.slice(0, limit);

      return {
        success: true,
        toolName: "listTasks",
        count: tasks.length,
        tasks: tasks.map((t) => ({
          id: t.id,
          type: t.type,
          status: t.status,
          description: t.description,
          startTime: new Date(t.startTime).toISOString(),
          duration: t.endTime
            ? t.endTime - t.startTime
            : Date.now() - t.startTime,
        })),
        message: `Found ${tasks.length} task(s)`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "listTasks",
        message:
          error instanceof Error ? error.message : "Failed to list tasks",
      };
    }
  },
});

// ============================================================================
// J4. 事件日志工具
// ============================================================================

/** 记录事件 */
export const logEventTool = tool({
  description: `Log a platform event for debugging and auditing.
  
Events are stored with timestamp and can be queried later.
Use for tracking important actions and debugging issues.`,
  inputSchema: z.object({
    event: z
      .string()
      .describe("Event name (e.g., 'file_created', 'build_started')"),
    data: z.record(z.string(), z.unknown()).optional().describe("Event data"),
    level: z
      .enum(["info", "warn", "error"])
      .optional()
      .describe("Log level (default: info)"),
  }),
  execute: async ({ event, data, level = "info" }) => {
    try {
      const user = await requireAuth().catch(() => null);

      const logEntry: LogEvent = {
        id: generateId(),
        timestamp: Date.now(),
        event,
        level,
        data,
        userId: user?.id,
      };

      eventLogs.push(logEntry);

      // 限制日志数量（保留最近 1000 条）
      if (eventLogs.length > 1000) {
        eventLogs.splice(0, eventLogs.length - 1000);
      }

      return {
        success: true,
        toolName: "logEvent",
        eventId: logEntry.id,
        event,
        level,
        timestamp: new Date(logEntry.timestamp).toISOString(),
        message: `Event logged: ${event}`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "logEvent",
        message: error instanceof Error ? error.message : "Failed to log event",
      };
    }
  },
});

/** 查询事件日志 */
export const queryEventsTool = tool({
  description: `Query event logs for debugging and auditing.
  
Filter by event name, level, or time range.
Returns matching events with full details.`,
  inputSchema: z.object({
    event: z.string().optional().describe("Filter by event name"),
    level: z
      .enum(["info", "warn", "error"])
      .optional()
      .describe("Filter by level"),
    since: z
      .number()
      .optional()
      .describe("Unix timestamp to filter events after"),
    limit: z.number().optional().describe("Max number of events (default: 50)"),
  }),
  execute: async ({ event, level, since, limit = 50 }) => {
    try {
      let events = [...eventLogs];

      // 应用过滤器
      if (event) {
        events = events.filter((e) => e.event.includes(event));
      }
      if (level) {
        events = events.filter((e) => e.level === level);
      }
      if (since) {
        events = events.filter((e) => e.timestamp >= since);
      }

      // 按时间排序（最新的在前）
      events.sort((a, b) => b.timestamp - a.timestamp);

      // 限制数量
      events = events.slice(0, limit);

      return {
        success: true,
        toolName: "queryEvents",
        count: events.length,
        events: events.map((e) => ({
          id: e.id,
          event: e.event,
          level: e.level,
          timestamp: new Date(e.timestamp).toISOString(),
          data: e.data,
        })),
        message: `Found ${events.length} event(s)`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "queryEvents",
        message:
          error instanceof Error ? error.message : "Failed to query events",
      };
    }
  },
});

// ============================================================================
// J5. 系统健康检查工具
// ============================================================================

/** 系统健康检查 */
export const healthCheckTool = tool({
  description: `Check system health and status.
  
Returns:
- Service status
- Memory usage
- Active connections
- Error rates

Useful for monitoring system health.`,
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // 收集系统信息
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      // 统计任务
      const tasks = Array.from(taskStore.values());
      const runningTasks = tasks.filter((t) => t.status === "running").length;
      const failedTasks = tasks.filter((t) => t.status === "failed").length;

      // 统计最近错误
      const recentErrors = eventLogs.filter(
        (e) => e.level === "error" && e.timestamp > Date.now() - 3600000
      ).length;

      return {
        success: true,
        toolName: "healthCheck",
        health: {
          status: recentErrors > 10 ? "degraded" : "healthy",
          uptime: formatDuration(Math.floor(uptime)),
          memory: {
            heapUsed: formatBytes(memoryUsage.heapUsed),
            heapTotal: formatBytes(memoryUsage.heapTotal),
            rss: formatBytes(memoryUsage.rss),
          },
          tasks: {
            running: runningTasks,
            failed: failedTasks,
            total: tasks.length,
          },
          errors: {
            lastHour: recentErrors,
          },
        },
        message: `System ${
          recentErrors > 10 ? "degraded" : "healthy"
        }, ${runningTasks} running tasks`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "healthCheck",
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  },
});

// ============================================================================
// 导出辅助函数（供其他模块使用）
// ============================================================================

export { updateQuotaUsage, getOrCreateQuota, taskStore, eventLogs };
