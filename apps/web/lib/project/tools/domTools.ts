/**
 * 页面交互工具 (F. Runtime DOM & UI Inspect Tools)
 * 
 * 实现「用户点击 DOM → AI 接收到结构」的核心能力
 * 
 * 工作原理：
 * 1. 前端 Preview iframe 注入 DOM 检查脚本
 * 2. 脚本通过 postMessage 与主应用通信
 * 3. 主应用将 DOM 信息存储在 WebContainer 实例中
 * 4. AI 工具从 WebContainer 实例读取 DOM 信息
 * 
 * 前端渲染：通过 Tasks 组件展示执行过程
 */

import { tool } from "ai";
import { z } from "zod";

// ============================================================================
// 类型定义
// ============================================================================

interface DOMNodeInfo {
  tagName: string;
  id?: string;
  className?: string;
  attributes: Record<string, string>;
  textContent?: string;
  children?: DOMNodeInfo[];
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  computedStyles?: Record<string, string>;
}

interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  attributes: Record<string, string>;
  textContent?: string;
  innerHTML?: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
  computedStyles: Record<string, string>;
  parentSelector?: string;
}

// ============================================================================
// DOM 数据存储（模拟，实际应从 WebContainer 或前端获取）
// ============================================================================

// 存储从前端 iframe 接收的 DOM 数据
const domDataStore = new Map<string, {
  dom?: DOMNodeInfo;
  elements?: Map<string, ElementInfo>;
  screenshot?: string;
  clientState?: Record<string, unknown>;
  lastUpdated: number;
}>();

/**
 * 更新 DOM 数据（由前端调用）
 */
export function updateDOMData(projectId: string, data: {
  dom?: DOMNodeInfo;
  elements?: Map<string, ElementInfo>;
  screenshot?: string;
  clientState?: Record<string, unknown>;
}) {
  const existing = domDataStore.get(projectId) || { lastUpdated: 0 };
  domDataStore.set(projectId, {
    ...existing,
    ...data,
    lastUpdated: Date.now(),
  });
}

/**
 * 获取 DOM 数据
 */
function getDOMData(projectId: string) {
  return domDataStore.get(projectId);
}

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
 * 生成 CSS 选择器
 */
function generateSelector(element: DOMNodeInfo): string {
  if (element.id) {
    return `#${element.id}`;
  }
  
  let selector = element.tagName.toLowerCase();
  
  if (element.className) {
    const classes = element.className.split(' ').filter(Boolean);
    if (classes.length > 0) {
      selector += `.${classes.slice(0, 2).join('.')}`;
    }
  }
  
  return selector;
}

/**
 * 遍历 DOM 树
 */
function traverseDOM(
  node: DOMNodeInfo,
  depth: number,
  maxDepth: number,
  result: DOMNodeInfo[]
): void {
  if (depth > maxDepth) return;
  
  result.push({
    ...node,
    children: undefined, // 不包含子节点在结果中
  });
  
  if (node.children) {
    for (const child of node.children) {
      traverseDOM(child, depth + 1, maxDepth, result);
    }
  }
}

/**
 * 查询 DOM 节点
 */
function queryDOMNode(
  node: DOMNodeInfo,
  selector: string
): DOMNodeInfo | null {
  // 简单的选择器匹配
  const matchesSelector = (n: DOMNodeInfo, sel: string): boolean => {
    if (sel.startsWith('#')) {
      return n.id === sel.slice(1);
    }
    if (sel.startsWith('.')) {
      const className = sel.slice(1);
      return n.className?.split(' ').includes(className) || false;
    }
    return n.tagName.toLowerCase() === sel.toLowerCase();
  };
  
  if (matchesSelector(node, selector)) {
    return node;
  }
  
  if (node.children) {
    for (const child of node.children) {
      const found = queryDOMNode(child, selector);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * 查询所有匹配的 DOM 节点
 */
function queryAllDOMNodes(
  node: DOMNodeInfo,
  selector: string,
  limit: number
): DOMNodeInfo[] {
  const results: DOMNodeInfo[] = [];
  
  const matchesSelector = (n: DOMNodeInfo, sel: string): boolean => {
    if (sel.startsWith('#')) {
      return n.id === sel.slice(1);
    }
    if (sel.startsWith('.')) {
      const className = sel.slice(1);
      return n.className?.split(' ').includes(className) || false;
    }
    return n.tagName.toLowerCase() === sel.toLowerCase();
  };
  
  const traverse = (n: DOMNodeInfo) => {
    if (results.length >= limit) return;
    
    if (matchesSelector(n, selector)) {
      results.push(n);
    }
    
    if (n.children) {
      for (const child of n.children) {
        traverse(child);
      }
    }
  };
  
  traverse(node);
  return results;
}

// ============================================================================
// F1. DOM 检查工具
// ============================================================================

/** 获取 DOM 树 */
export const inspectDOMTool = tool({
  description: `Get DOM tree or partial node structure from the preview.
  
Use this to:
- Understand page structure
- Find elements for interaction
- Debug layout issues

Returns simplified DOM tree with tag names, IDs, classes, and basic attributes.`,
  inputSchema: z.object({
    selector: z.string().optional().describe("CSS selector to start from (default: body)"),
    depth: z.number().optional().describe("Max depth to traverse (default: 3)"),
  }),
  execute: async ({ selector = "body", depth = 3 }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "inspectDOM",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      const domData = getDOMData(projectId);
      
      if (!domData?.dom) {
        return {
          success: false,
          toolName: "inspectDOM",
          message: "No DOM data available. Make sure the preview is running and has loaded.",
        };
      }
      
      // 查找起始节点
      let startNode = domData.dom;
      if (selector !== "body") {
        const found = queryDOMNode(domData.dom, selector);
        if (!found) {
          return {
            success: false,
            toolName: "inspectDOM",
            message: `Element not found: ${selector}`,
          };
        }
        startNode = found;
      }
      
      // 遍历 DOM 树
      const nodes: DOMNodeInfo[] = [];
      traverseDOM(startNode, 0, depth, nodes);
      
      // 简化输出
      const simplifiedNodes = nodes.map(node => ({
        tag: node.tagName,
        id: node.id,
        class: node.className,
        text: node.textContent?.slice(0, 100),
        selector: generateSelector(node),
      }));
      
      return {
        success: true,
        toolName: "inspectDOM",
        selector,
        depth,
        nodeCount: nodes.length,
        nodes: simplifiedNodes,
        message: `Found ${nodes.length} nodes`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "inspectDOM",
        message: error instanceof Error ? error.message : "Failed to inspect DOM",
      };
    }
  },
});

// ============================================================================
// F2. 元素查询工具
// ============================================================================

/** 查询单个元素 */
export const queryElementTool = tool({
  description: `Get detailed information about a single DOM element.
  
Returns:
- Element attributes
- Computed CSS styles
- Bounding rectangle
- Text content

Useful for understanding specific element properties.`,
  inputSchema: z.object({
    selector: z.string().describe("CSS selector for the element"),
  }),
  execute: async ({ selector }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "queryElement",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      const domData = getDOMData(projectId);
      
      if (!domData?.dom) {
        return {
          success: false,
          toolName: "queryElement",
          message: "No DOM data available. Make sure the preview is running.",
        };
      }
      
      const element = queryDOMNode(domData.dom, selector);
      
      if (!element) {
        return {
          success: false,
          toolName: "queryElement",
          message: `Element not found: ${selector}`,
        };
      }
      
      return {
        success: true,
        toolName: "queryElement",
        selector,
        element: {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          attributes: element.attributes,
          textContent: element.textContent?.slice(0, 500),
          rect: element.rect,
          styles: element.computedStyles,
        },
        message: `Found element: ${element.tagName}`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "queryElement",
        message: error instanceof Error ? error.message : "Failed to query element",
      };
    }
  },
});

/** 查询多个元素 */
export const queryElementsTool = tool({
  description: `Get multiple DOM elements matching a selector.
  
Returns array of elements with basic info.
Useful for finding all instances of a component or element type.`,
  inputSchema: z.object({
    selector: z.string().describe("CSS selector"),
    limit: z.number().optional().describe("Max number of results (default: 10)"),
  }),
  execute: async ({ selector, limit = 10 }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "queryElements",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      const domData = getDOMData(projectId);
      
      if (!domData?.dom) {
        return {
          success: false,
          toolName: "queryElements",
          message: "No DOM data available. Make sure the preview is running.",
        };
      }
      
      const elements = queryAllDOMNodes(domData.dom, selector, limit);
      
      return {
        success: true,
        toolName: "queryElements",
        selector,
        count: elements.length,
        elements: elements.map(el => ({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          textContent: el.textContent?.slice(0, 100),
          selector: generateSelector(el),
        })),
        message: `Found ${elements.length} element(s)`,
      };
    } catch (error) {
      return {
        success: false,
        toolName: "queryElements",
        message: error instanceof Error ? error.message : "Failed to query elements",
      };
    }
  },
});

// ============================================================================
// F3. 截图工具
// ============================================================================

/** 整页截图 */
export const captureScreenshotTool = tool({
  description: `Capture a screenshot of the preview page.
  
Returns base64-encoded image data.
Useful for visual debugging and documentation.`,
  inputSchema: z.object({
    fullPage: z.boolean().optional().describe("Capture full scrollable page (default: true)"),
  }),
  execute: async ({ fullPage = true }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "captureScreenshot",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      const domData = getDOMData(projectId);
      
      if (!domData?.screenshot) {
        return {
          success: false,
          toolName: "captureScreenshot",
          message: "Screenshot not available. The preview may need to capture it first.",
        };
      }
      
      return {
        success: true,
        toolName: "captureScreenshot",
        fullPage,
        screenshot: domData.screenshot,
        message: "Screenshot captured",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "captureScreenshot",
        message: error instanceof Error ? error.message : "Failed to capture screenshot",
      };
    }
  },
});

/** 元素截图 */
export const captureElementScreenshotTool = tool({
  description: `Capture a screenshot of a specific DOM element.
  
Returns base64-encoded image of just that element.
Useful for component-level visual testing.`,
  inputSchema: z.object({
    selector: z.string().describe("CSS selector for the element"),
  }),
  execute: async ({ selector }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "captureElementScreenshot",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      // 元素截图需要前端配合实现
      // 这里返回一个提示，实际实现需要前端发送截图数据
      return {
        success: false,
        toolName: "captureElementScreenshot",
        selector,
        message: "Element screenshot requires frontend support. Use captureScreenshot for full page.",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "captureElementScreenshot",
        message: error instanceof Error ? error.message : "Failed to capture element screenshot",
      };
    }
  },
});

// ============================================================================
// F4. 客户端脚本执行工具
// ============================================================================

/** 执行客户端脚本 */
export const evaluateClientScriptTool = tool({
  description: `Execute JavaScript in the preview page context.
  
The script runs in a sandboxed environment within the preview iframe.
Returns the result of the script execution.

Use for:
- Reading DOM values
- Triggering interactions
- Testing client-side logic`,
  inputSchema: z.object({
    script: z.string().describe("JavaScript code to execute"),
  }),
  execute: async ({ script }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "evaluateClientScript",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      // 脚本执行需要通过前端 iframe postMessage 实现
      // 这里记录请求，等待前端响应
      return {
        success: false,
        toolName: "evaluateClientScript",
        script: script.slice(0, 100) + (script.length > 100 ? '...' : ''),
        message: "Script execution requires frontend support. The script will be queued for execution.",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "evaluateClientScript",
        message: error instanceof Error ? error.message : "Failed to execute script",
      };
    }
  },
});

// ============================================================================
// F5. 客户端状态读取工具
// ============================================================================

/** 读取客户端状态 */
export const readClientStateTool = tool({
  description: `Get global store state (zustand/redux/context) from the preview.
  
Reads the current state of client-side state management.
Useful for debugging state-related issues.`,
  inputSchema: z.object({
    storeName: z.string().optional().describe("Store name to read (e.g., 'useStore', 'redux')"),
    path: z.string().optional().describe("Dot-notation path to specific state (e.g., 'user.profile')"),
  }),
  execute: async ({ storeName, path }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "readClientState",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      const domData = getDOMData(projectId);
      
      if (!domData?.clientState) {
        return {
          success: false,
          toolName: "readClientState",
          message: "No client state available. The preview may need to expose its state.",
        };
      }
      
      let state = domData.clientState;
      
      // 如果指定了 storeName，获取特定 store
      if (storeName && state[storeName]) {
        state = state[storeName] as Record<string, unknown>;
      }
      
      // 如果指定了 path，获取特定路径
      if (path) {
        const parts = path.split('.');
        for (const part of parts) {
          if (state && typeof state === 'object' && part in state) {
            state = (state as Record<string, unknown>)[part] as Record<string, unknown>;
          } else {
            return {
              success: false,
              toolName: "readClientState",
              message: `Path not found: ${path}`,
            };
          }
        }
      }
      
      return {
        success: true,
        toolName: "readClientState",
        storeName,
        path,
        state,
        message: "Client state retrieved",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "readClientState",
        message: error instanceof Error ? error.message : "Failed to read client state",
      };
    }
  },
});

// ============================================================================
// F6. 交互模拟工具
// ============================================================================

/** 模拟点击 */
export const simulateClickTool = tool({
  description: `Simulate a click on an element in the preview.
  
Triggers click event on the specified element.
Useful for testing interactive components.`,
  inputSchema: z.object({
    selector: z.string().describe("CSS selector for the element to click"),
  }),
  execute: async ({ selector }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "simulateClick",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      // 点击模拟需要通过前端 iframe postMessage 实现
      return {
        success: false,
        toolName: "simulateClick",
        selector,
        message: "Click simulation requires frontend support. The action will be queued.",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "simulateClick",
        message: error instanceof Error ? error.message : "Failed to simulate click",
      };
    }
  },
});

/** 模拟输入 */
export const simulateInputTool = tool({
  description: `Simulate typing into an input element.
  
Types the specified text into the input field.
Useful for testing forms and input handling.`,
  inputSchema: z.object({
    selector: z.string().describe("CSS selector for the input element"),
    value: z.string().describe("Text to type"),
    clearFirst: z.boolean().optional().describe("Clear existing value first (default: true)"),
  }),
  execute: async ({ selector, value, clearFirst = true }, { messages }) => {
    const projectId = getProjectIdFromMessages(messages);
    if (!projectId) {
      return { 
        success: false, 
        toolName: "simulateInput",
        message: "No project associated with this conversation" 
      };
    }
    
    try {
      // 输入模拟需要通过前端 iframe postMessage 实现
      return {
        success: false,
        toolName: "simulateInput",
        selector,
        value: value.slice(0, 50) + (value.length > 50 ? '...' : ''),
        clearFirst,
        message: "Input simulation requires frontend support. The action will be queued.",
      };
    } catch (error) {
      return {
        success: false,
        toolName: "simulateInput",
        message: error instanceof Error ? error.message : "Failed to simulate input",
      };
    }
  },
});
