/**
 * Diff / Patch / AST 工具 (H. Diff / Patch / AST Tools)
 * 
 * Vibe Coding 平台的关键能力 - 安全修改核心
 * 支持：
 * - 生成 unified diff
 * - 应用 diff 补丁
 * - AST 级别的代码修改
 * 
 * 前端渲染：通过 Tasks 组件展示执行过程
 */

import { tool } from "ai";
import { z } from "zod";
import { getProjectInfoAction, updateProjectFilesAction } from "@/lib/project/db/project-actions";

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 从 context.messages 提取 projectId
 * 支持工具包装器注入和消息 metadata 两种方式
 */
function getProjectIdFromMessages(messages: unknown): string | undefined {
  // 方式1：从包装器注入的对象中获取
  if (messages && typeof messages === 'object' && 'projectId' in messages) {
    return (messages as { projectId?: string }).projectId;
  }
  // 方式2：从消息数组的 metadata 中获取
  if (Array.isArray(messages) && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    return (lastMessage as { metadata?: { projectId?: string } })?.metadata?.projectId;
  }
  return undefined;
}

/**
 * 生成 unified diff 格式
 */
function generateUnifiedDiff(
  filePath: string,
  oldContent: string,
  newContent: string
): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  // 简单的行级 diff 实现
  const diff: string[] = [];
  diff.push(`--- a/${filePath}`);
  diff.push(`+++ b/${filePath}`);
  
  // 使用 LCS (Longest Common Subsequence) 算法的简化版本
  const hunks = computeHunks(oldLines, newLines);
  
  for (const hunk of hunks) {
    diff.push(`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`);
    for (const line of hunk.lines) {
      diff.push(line);
    }
  }
  
  return diff.join('\n');
}

interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: string[];
}

/**
 * 计算 diff hunks
 */
function computeHunks(oldLines: string[], newLines: string[]): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const contextLines = 3; // 上下文行数
  
  // 简单的逐行比较
  let i = 0;
  let j = 0;
  
  while (i < oldLines.length || j < newLines.length) {
    // 找到差异开始的位置
    while (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      i++;
      j++;
    }
    
    if (i >= oldLines.length && j >= newLines.length) break;
    
    // 记录差异开始位置
    const hunkOldStart = Math.max(1, i - contextLines + 1);
    const hunkNewStart = Math.max(1, j - contextLines + 1);
    const lines: string[] = [];
    
    // 添加上下文（差异前）
    for (let k = Math.max(0, i - contextLines); k < i; k++) {
      lines.push(` ${oldLines[k]}`);
    }
    
    // 找到差异结束的位置
    let diffEndOld = i;
    let diffEndNew = j;
    
    // 简单策略：找到下一个匹配点或到达末尾
    while (diffEndOld < oldLines.length || diffEndNew < newLines.length) {
      // 检查是否找到匹配
      if (diffEndOld < oldLines.length && diffEndNew < newLines.length) {
        // 尝试找到同步点
        let foundSync = false;
        for (let lookAhead = 0; lookAhead < 5; lookAhead++) {
          if (diffEndOld + lookAhead < oldLines.length && 
              diffEndNew + lookAhead < newLines.length &&
              oldLines[diffEndOld + lookAhead] === newLines[diffEndNew + lookAhead]) {
            // 添加删除的行
            for (let k = i; k < diffEndOld + lookAhead; k++) {
              if (k < oldLines.length) lines.push(`-${oldLines[k]}`);
            }
            // 添加新增的行
            for (let k = j; k < diffEndNew + lookAhead; k++) {
              if (k < newLines.length) lines.push(`+${newLines[k]}`);
            }
            diffEndOld += lookAhead;
            diffEndNew += lookAhead;
            foundSync = true;
            break;
          }
        }
        if (foundSync) break;
      }
      
      // 继续扩展差异区域
      if (diffEndOld < oldLines.length) diffEndOld++;
      if (diffEndNew < newLines.length) diffEndNew++;
      
      // 防止无限循环
      if (diffEndOld - i > 100 || diffEndNew - j > 100) break;
    }
    
    // 如果没有找到同步点，添加所有剩余的差异
    if (lines.length === Math.max(0, i - Math.max(0, i - contextLines))) {
      for (let k = i; k < diffEndOld; k++) {
        lines.push(`-${oldLines[k]}`);
      }
      for (let k = j; k < diffEndNew; k++) {
        lines.push(`+${newLines[k]}`);
      }
    }
    
    // 添加上下文（差异后）
    for (let k = diffEndOld; k < Math.min(oldLines.length, diffEndOld + contextLines); k++) {
      lines.push(` ${oldLines[k]}`);
    }
    
    if (lines.some(l => l.startsWith('+') || l.startsWith('-'))) {
      hunks.push({
        oldStart: hunkOldStart,
        oldCount: diffEndOld - Math.max(0, i - contextLines) + Math.min(contextLines, oldLines.length - diffEndOld),
        newStart: hunkNewStart,
        newCount: diffEndNew - Math.max(0, j - contextLines) + Math.min(contextLines, newLines.length - diffEndNew),
        lines,
      });
    }
    
    i = diffEndOld + contextLines;
    j = diffEndNew + contextLines;
  }
  
  return hunks;
}

/**
 * 应用 unified diff 到内容
 */
function applyUnifiedDiff(originalContent: string, diff: string): string {
  const lines = originalContent.split('\n');
  const diffLines = diff.split('\n');
  
  let resultLines = [...lines];
  let offset = 0; // 跟踪行号偏移
  
  let i = 0;
  while (i < diffLines.length) {
    const line = diffLines[i];
    
    // 解析 hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunkMatch) {
      const oldStart = parseInt(hunkMatch[1], 10) - 1; // 转为 0-based
      let currentLine = oldStart + offset;
      
      i++;
      while (i < diffLines.length && !diffLines[i].startsWith('@@') && !diffLines[i].startsWith('---') && !diffLines[i].startsWith('+++')) {
        const diffLine = diffLines[i];
        
        if (diffLine.startsWith('-')) {
          // 删除行
          if (currentLine < resultLines.length) {
            resultLines.splice(currentLine, 1);
            offset--;
          }
        } else if (diffLine.startsWith('+')) {
          // 添加行
          resultLines.splice(currentLine, 0, diffLine.substring(1));
          currentLine++;
          offset++;
        } else if (diffLine.startsWith(' ')) {
          // 上下文行，跳过
          currentLine++;
        }
        
        i++;
      }
    } else {
      i++;
    }
  }
  
  return resultLines.join('\n');
}

/**
 * 解析 TypeScript/JavaScript 代码的简单 AST 操作
 * 注意：这是一个简化实现，生产环境应使用 @babel/parser 或 typescript
 */
function performASTOperation(
  content: string,
  operation: "add" | "remove" | "modify",
  target: string,
  newContent?: string
): { success: boolean; content: string; message: string } {
  const lines = content.split('\n');
  
  // 查找目标（函数、类、变量等）
  const patterns = [
    // 函数声明
    new RegExp(`^(export\\s+)?(async\\s+)?function\\s+${escapeRegex(target)}\\s*\\(`),
    // 箭头函数
    new RegExp(`^(export\\s+)?(const|let|var)\\s+${escapeRegex(target)}\\s*=\\s*(async\\s+)?\\(`),
    // 类声明
    new RegExp(`^(export\\s+)?class\\s+${escapeRegex(target)}\\s*`),
    // 变量声明
    new RegExp(`^(export\\s+)?(const|let|var)\\s+${escapeRegex(target)}\\s*=`),
    // 接口/类型声明
    new RegExp(`^(export\\s+)?(interface|type)\\s+${escapeRegex(target)}\\s*`),
  ];
  
  let targetStart = -1;
  let targetEnd = -1;
  
  // 查找目标开始位置
  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    for (const pattern of patterns) {
      if (pattern.test(trimmedLine)) {
        targetStart = i;
        break;
      }
    }
    if (targetStart !== -1) break;
  }
  
  if (targetStart === -1 && operation !== "add") {
    return {
      success: false,
      content,
      message: `Target "${target}" not found in the file`,
    };
  }
  
  // 查找目标结束位置（通过括号匹配）
  if (targetStart !== -1) {
    let braceCount = 0;
    let parenCount = 0;
    let started = false;
    
    for (let i = targetStart; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
        } else if (char === '(') {
          parenCount++;
        } else if (char === ')') {
          parenCount--;
        }
      }
      
      // 对于简单声明（没有大括号），在分号或换行处结束
      if (!started && (line.includes(';') || (i > targetStart && !line.trim().startsWith('.')))) {
        targetEnd = i;
        break;
      }
      
      // 对于有大括号的声明，在括号匹配时结束
      if (started && braceCount === 0) {
        targetEnd = i;
        break;
      }
    }
    
    if (targetEnd === -1) {
      targetEnd = lines.length - 1;
    }
  }
  
  switch (operation) {
    case "add": {
      if (!newContent) {
        return { success: false, content, message: "Content required for add operation" };
      }
      // 在文件末尾添加
      const newLines = [...lines, '', newContent];
      return {
        success: true,
        content: newLines.join('\n'),
        message: `Added "${target}" to the file`,
      };
    }
    
    case "remove": {
      if (targetStart === -1) {
        return { success: false, content, message: `Target "${target}" not found` };
      }
      const newLines = [
        ...lines.slice(0, targetStart),
        ...lines.slice(targetEnd + 1),
      ];
      return {
        success: true,
        content: newLines.join('\n'),
        message: `Removed "${target}" from the file`,
      };
    }
    
    case "modify": {
      if (targetStart === -1) {
        return { success: false, content, message: `Target "${target}" not found` };
      }
      if (!newContent) {
        return { success: false, content, message: "Content required for modify operation" };
      }
      const newLines = [
        ...lines.slice(0, targetStart),
        newContent,
        ...lines.slice(targetEnd + 1),
      ];
      return {
        success: true,
        content: newLines.join('\n'),
        message: `Modified "${target}" in the file`,
      };
    }
    
    default:
      return { success: false, content, message: `Unknown operation: ${operation}` };
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// H1. Diff 生成工具
// ============================================================================

/** 生成 diff */
export const generateDiffTool = tool({
  description: `Compare old and new file content, generate unified diff format.
  
Use this tool to:
- Preview changes before applying them
- Generate patches for code review
- Create diff for version control

Returns unified diff format that can be applied with applyDiff tool.`,
  inputSchema: z.object({
    projectId: z.string().optional().describe("Project ID (optional, uses current project if not provided)"),
    filePath: z.string().describe("Path to the file"),
    newContent: z.string().describe("New content to compare against current"),
  }),
  execute: async ({ projectId: inputProjectId, filePath, newContent }, { messages }) => {
    const projectId = inputProjectId || getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "generateDiff",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      // 获取当前文件内容
      const result = await getProjectInfoAction(projectId);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          toolName: "generateDiff",
          message: result.error || "Failed to get project info",
        };
      }
      
      const files = (result.data.files as Record<string, string> | undefined) || {};
      const oldContent = files[filePath] || '';
      
      // 生成 diff
      const diff = generateUnifiedDiff(filePath, oldContent, newContent);
      
      // 计算变更统计
      const additions = (diff.match(/^\+[^+]/gm) || []).length;
      const deletions = (diff.match(/^-[^-]/gm) || []).length;
      
      return {
        success: true,
        toolName: "generateDiff",
        filePath,
        diff,
        stats: {
          additions,
          deletions,
          total: additions + deletions,
        },
        message: `Generated diff: +${additions} -${deletions} lines`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "generateDiff",
        message: error instanceof Error ? error.message : "Failed to generate diff",
      };
    }
  },
});

// ============================================================================
// H2. Diff 应用工具
// ============================================================================

/** 应用 diff */
export const applyDiffTool = tool({
  description: `Apply a unified diff to a project file.
  
This is safer than full file overwrite because:
- Only changes specific lines
- Preserves unchanged content
- Can be reviewed before applying

Use generateDiff first to create the diff, then apply it with this tool.`,
  inputSchema: z.object({
    projectId: z.string().optional().describe("Project ID (optional)"),
    filePath: z.string().describe("Path to the file"),
    diff: z.string().describe("Unified diff to apply"),
  }),
  execute: async ({ projectId: inputProjectId, filePath, diff }, { messages }) => {
    const projectId = inputProjectId || getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "applyDiff",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      // 获取当前文件内容
      const result = await getProjectInfoAction(projectId);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          toolName: "applyDiff",
          message: result.error || "Failed to get project info",
        };
      }
      
      const files = (result.data.files as Record<string, string> | undefined) || {};
      const originalContent = files[filePath];
      
      if (originalContent === undefined) {
        return {
          success: false,
          toolName: "applyDiff",
          message: `File not found: ${filePath}`,
        };
      }
      
      // 应用 diff
      const newContent = applyUnifiedDiff(originalContent, diff);
      
      // 保存文件
      const updateResult = await updateProjectFilesAction(projectId, {
        [filePath]: newContent,
      });
      
      if (!updateResult.success) {
        return {
          success: false,
          toolName: "applyDiff",
          message: updateResult.error || "Failed to save file",
        };
      }
      
      return {
        success: true,
        toolName: "applyDiff",
        filePath,
        message: `Applied diff to ${filePath}`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "applyDiff",
        message: error instanceof Error ? error.message : "Failed to apply diff",
      };
    }
  },
});

// ============================================================================
// H3. AST Patch 工具
// ============================================================================

/** 生成并应用 AST Patch */
export const generateASTPatchTool = tool({
  description: `Generate and apply AST-based patch for smarter code modifications.
  
This tool understands code structure and can:
- Add new functions, classes, or variables
- Remove existing code blocks by name
- Modify specific functions or classes

More precise than text-based diff for structural changes.`,
  inputSchema: z.object({
    projectId: z.string().optional().describe("Project ID (optional)"),
    filePath: z.string().describe("Path to the file"),
    operation: z.enum(["add", "remove", "modify"]).describe("Operation type"),
    target: z.string().describe("Target identifier (function name, class name, variable name, etc.)"),
    content: z.string().optional().describe("New content for add/modify operations"),
  }),
  execute: async ({ projectId: inputProjectId, filePath, operation, target, content }, { messages }) => {
    const projectId = inputProjectId || getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "generateASTPatch",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      // 获取当前文件内容
      const result = await getProjectInfoAction(projectId);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          toolName: "generateASTPatch",
          message: result.error || "Failed to get project info",
        };
      }
      
      const files = (result.data.files as Record<string, string> | undefined) || {};
      const originalContent = files[filePath];
      
      if (originalContent === undefined && operation !== "add") {
        return {
          success: false,
          toolName: "generateASTPatch",
          message: `File not found: ${filePath}`,
        };
      }
      
      // 执行 AST 操作
      const astResult = performASTOperation(
        originalContent || '',
        operation,
        target,
        content
      );
      
      if (!astResult.success) {
        return {
          success: false,
          toolName: "generateASTPatch",
          message: astResult.message,
        };
      }
      
      // 保存文件
      const updateResult = await updateProjectFilesAction(projectId, {
        [filePath]: astResult.content,
      });
      
      if (!updateResult.success) {
        return {
          success: false,
          toolName: "generateASTPatch",
          message: updateResult.error || "Failed to save file",
        };
      }
      
      return {
        success: true,
        toolName: "generateASTPatch",
        filePath,
        operation,
        target,
        message: astResult.message,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "generateASTPatch",
        message: error instanceof Error ? error.message : "Failed to apply AST patch",
      };
    }
  },
});

// ============================================================================
// H4. 搜索替换工具
// ============================================================================

/** 搜索替换 */
export const searchReplaceTool = tool({
  description: `Search and replace text in a file.
  
Supports:
- Exact string matching
- Regular expression patterns
- Replace all occurrences or first only

Useful for quick text modifications without full file rewrite.`,
  inputSchema: z.object({
    projectId: z.string().optional().describe("Project ID (optional)"),
    filePath: z.string().describe("Path to the file"),
    search: z.string().describe("Text or regex pattern to search for"),
    replace: z.string().describe("Replacement text"),
    isRegex: z.boolean().optional().describe("Treat search as regex (default: false)"),
    replaceAll: z.boolean().optional().describe("Replace all occurrences (default: true)"),
  }),
  execute: async ({ projectId: inputProjectId, filePath, search, replace, isRegex = false, replaceAll = true }, { messages }) => {
    const projectId = inputProjectId || getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "searchReplace",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      // 获取当前文件内容
      const result = await getProjectInfoAction(projectId);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          toolName: "searchReplace",
          message: result.error || "Failed to get project info",
        };
      }
      
      const files = (result.data.files as Record<string, string> | undefined) || {};
      const originalContent = files[filePath];
      
      if (originalContent === undefined) {
        return {
          success: false,
          toolName: "searchReplace",
          message: `File not found: ${filePath}`,
        };
      }
      
      // 执行搜索替换
      let newContent: string;
      let matchCount: number;
      
      if (isRegex) {
        const regex = new RegExp(search, replaceAll ? 'g' : '');
        const matches = originalContent.match(new RegExp(search, 'g'));
        matchCount = matches ? matches.length : 0;
        newContent = originalContent.replace(regex, replace);
      } else {
        if (replaceAll) {
          const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedSearch, 'g');
          const matches = originalContent.match(regex);
          matchCount = matches ? matches.length : 0;
          newContent = originalContent.replace(regex, replace);
        } else {
          matchCount = originalContent.includes(search) ? 1 : 0;
          newContent = originalContent.replace(search, replace);
        }
      }
      
      if (matchCount === 0) {
        return {
          success: false,
          toolName: "searchReplace",
          message: `No matches found for "${search}"`,
        };
      }
      
      // 保存文件
      const updateResult = await updateProjectFilesAction(projectId, {
        [filePath]: newContent,
      });
      
      if (!updateResult.success) {
        return {
          success: false,
          toolName: "searchReplace",
          message: updateResult.error || "Failed to save file",
        };
      }
      
      return {
        success: true,
        toolName: "searchReplace",
        filePath,
        matchCount,
        message: `Replaced ${matchCount} occurrence(s) in ${filePath}`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "searchReplace",
        message: error instanceof Error ? error.message : "Failed to search and replace",
      };
    }
  },
});
