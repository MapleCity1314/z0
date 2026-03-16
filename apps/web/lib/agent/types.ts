import { InferUITool, UIMessage } from "ai";
import z from "zod";

// ============================================================================
// A. Web Tools - Tavily AI SDK 工具
// ============================================================================
import { 
  tavilySearchTool,    // 实时网络搜索
  tavilyExtractTool,   // URL 内容提取
  tavilyCrawlTool,     // 网站爬取
  tavilyMapTool        // 网站结构映射
} from "@/lib/tools/tavilyTools";

// ============================================================================
// B. Artifact Tools - 代码工件管理
// ============================================================================
import { 
  createArtifactTool,  // 创建代码工件
  readArtifactTool,    // 读取代码工件
  updateArtifactTool,  // 更新代码工件
  listArtifactsTool    // 列出所有工�?
} from "@/lib/tools/codeArtifactTool";

// ============================================================================
// C. Project File System - 项目文件系统操作
// ============================================================================
import {
  readProjectFilesTool,    // 读取项目文件列表
  getProjectFileTool,      // 获取单个文件内容
  existsProjectFileTool,   // 检查文件是否存�?
  createProjectFileTool,   // 创建新文�?
  updateProjectFileTool,   // 更新/覆盖文件
  patchProjectFileTool,    // 基于 diff 修改文件
  deleteProjectFileTool,   // 删除文件
  getProjectInfoTool,      // 获取项目信息
  updateProjectInfoTool,   // 更新项目信息
  createProjectTool,       // 创建新项�?
  listProjectsTool         // 列出用户项目
} from "@/lib/project/tools/projectTools";

// ============================================================================
// D. Build & Dependency - 依赖管理和构建系�?
// ============================================================================
import {
  addDependencyTool,       // 添加依赖�?
  removeDependencyTool,    // 移除依赖�?
  installDependenciesTool, // 安装所有依�?
  runBuildTool,           // 运行构建命令
  runLintTool,            // 运行代码检�?
  runFormatTool,          // 运行代码格式�?
  runScriptTool           // 运行 package.json 脚本
} from "@/lib/project/tools/buildTools";

// ============================================================================
// E. Runtime & Preview - 运行时和预览服务
// ============================================================================
import {
  startDevServerTool,           // 启动开发服务器
  startPreviewServerTool,       // 启动预览服务�?
  stopServerTool,               // 停止服务�?
  proxyRequestToDevServerTool,  // 代理请求到开发服务器
  getServerStatusTool           // 获取服务器状�?
} from "@/lib/project/tools/runtimeTools";

// ============================================================================
// F. DOM & Interaction - DOM 交互和页面检�?
// ============================================================================
import {
  inspectDOMTool,               // 检�?DOM 结构
  queryElementTool,             // 查询单个元素
  queryElementsTool,            // 查询多个元素
  captureScreenshotTool,        // 整页截图
  captureElementScreenshotTool, // 元素截图
  evaluateClientScriptTool,     // 执行客户端脚�?
  readClientStateTool           // 读取客户端状�?
} from "@/lib/project/tools/domTools";

// ============================================================================
// G. Observability - 运行时调试和监控
// ============================================================================
import {
  getConsoleLogsTool,       // 获取控制台日�?
  clearConsoleLogsTool,     // 清空控制台日�?
  getNetworkRequestsTool,   // 获取网络请求记录
  clearNetworkRequestsTool, // 清空网络请求记录
  getPerformanceMetricsTool // 获取性能指标
} from "@/lib/project/tools/observabilityTools";

// ============================================================================
// H. Diff / Patch / AST - 代码差异�?AST 操作
// ============================================================================
import {
  generateDiffTool,     // 生成文件差异
  applyDiffTool,        // 应用差异补丁
  generateASTPatchTool  // 生成 AST 补丁
} from "@/lib/project/tools/diffTools";

// ============================================================================
// J. System & Security - 系统安全和资源管�?
// ============================================================================
import {
  runSandboxedScriptTool, // 安全执行脚本
  getQuotaUsageTool,      // 获取配额使用情况
  terminateTaskTool,      // 终止长任�?
  logEventTool            // 记录事件
} from "@/lib/tools/systemTools";

// ============================================================================
// File Package Tools - 文件打包和下�?
// ============================================================================
import {
  saveFileTool,         // 保存单个文件
  saveMultipleFilesTool, // 保存多个文件
  createZipTool,        // 创建 ZIP 压缩�?
  listPackagesTool      // 列出已打包文�?
} from "@/lib/tools/filePackageTool";

// ============================================================================
// 数据类型定义
// ============================================================================
export type DataPart = {
    type: "append-message"; 
    message: string
}

// ============================================================================
// 工具类型推断 - A. Web Tools
// ============================================================================
type TavilySearchToolType = InferUITool<typeof tavilySearchTool>;
type TavilyExtractToolType = InferUITool<typeof tavilyExtractTool>;
type TavilyCrawlToolType = InferUITool<typeof tavilyCrawlTool>;
type TavilyMapToolType = InferUITool<typeof tavilyMapTool>;

// ============================================================================
// 工具类型推断 - B. Artifact Tools
// ============================================================================
type CreateArtifactToolType = InferUITool<typeof createArtifactTool>;
type ReadArtifactToolType = InferUITool<typeof readArtifactTool>;
type UpdateArtifactToolType = InferUITool<typeof updateArtifactTool>;
type ListArtifactsToolType = InferUITool<typeof listArtifactsTool>;

// ============================================================================
// 工具类型推断 - C. Project File System
// ============================================================================
type ReadProjectFilesToolType = InferUITool<typeof readProjectFilesTool>;
type GetProjectFileToolType = InferUITool<typeof getProjectFileTool>;
type ExistsProjectFileToolType = InferUITool<typeof existsProjectFileTool>;
type CreateProjectFileToolType = InferUITool<typeof createProjectFileTool>;
type UpdateProjectFileToolType = InferUITool<typeof updateProjectFileTool>;
type PatchProjectFileToolType = InferUITool<typeof patchProjectFileTool>;
type DeleteProjectFileToolType = InferUITool<typeof deleteProjectFileTool>;
type GetProjectInfoToolType = InferUITool<typeof getProjectInfoTool>;
type UpdateProjectInfoToolType = InferUITool<typeof updateProjectInfoTool>;
type CreateProjectToolType = InferUITool<typeof createProjectTool>;
type ListProjectsToolType = InferUITool<typeof listProjectsTool>;

// ============================================================================
// 工具类型推断 - D. Build & Dependency
// ============================================================================
type AddDependencyToolType = InferUITool<typeof addDependencyTool>;
type RemoveDependencyToolType = InferUITool<typeof removeDependencyTool>;
type InstallDependenciesToolType = InferUITool<typeof installDependenciesTool>;
type RunBuildToolType = InferUITool<typeof runBuildTool>;
type RunLintToolType = InferUITool<typeof runLintTool>;
type RunFormatToolType = InferUITool<typeof runFormatTool>;
type RunScriptToolType = InferUITool<typeof runScriptTool>;

// ============================================================================
// 工具类型推断 - E. Runtime & Preview
// ============================================================================
type StartDevServerToolType = InferUITool<typeof startDevServerTool>;
type StartPreviewServerToolType = InferUITool<typeof startPreviewServerTool>;
type StopServerToolType = InferUITool<typeof stopServerTool>;
type ProxyRequestToDevServerToolType = InferUITool<typeof proxyRequestToDevServerTool>;
type GetServerStatusToolType = InferUITool<typeof getServerStatusTool>;

// ============================================================================
// 工具类型推断 - F. DOM & Interaction
// ============================================================================
type InspectDOMToolType = InferUITool<typeof inspectDOMTool>;
type QueryElementToolType = InferUITool<typeof queryElementTool>;
type QueryElementsToolType = InferUITool<typeof queryElementsTool>;
type CaptureScreenshotToolType = InferUITool<typeof captureScreenshotTool>;
type CaptureElementScreenshotToolType = InferUITool<typeof captureElementScreenshotTool>;
type EvaluateClientScriptToolType = InferUITool<typeof evaluateClientScriptTool>;
type ReadClientStateToolType = InferUITool<typeof readClientStateTool>;

// ============================================================================
// 工具类型推断 - G. Observability
// ============================================================================
type GetConsoleLogsToolType = InferUITool<typeof getConsoleLogsTool>;
type ClearConsoleLogsToolType = InferUITool<typeof clearConsoleLogsTool>;
type GetNetworkRequestsToolType = InferUITool<typeof getNetworkRequestsTool>;
type ClearNetworkRequestsToolType = InferUITool<typeof clearNetworkRequestsTool>;
type GetPerformanceMetricsToolType = InferUITool<typeof getPerformanceMetricsTool>;

// ============================================================================
// 工具类型推断 - H. Diff / Patch / AST
// ============================================================================
type GenerateDiffToolType = InferUITool<typeof generateDiffTool>;
type ApplyDiffToolType = InferUITool<typeof applyDiffTool>;
type GenerateASTPatchToolType = InferUITool<typeof generateASTPatchTool>;

// ============================================================================
// 工具类型推断 - J. System & Security
// ============================================================================
type RunSandboxedScriptToolType = InferUITool<typeof runSandboxedScriptTool>;
type GetQuotaUsageToolType = InferUITool<typeof getQuotaUsageTool>;
type TerminateTaskToolType = InferUITool<typeof terminateTaskTool>;
type LogEventToolType = InferUITool<typeof logEventTool>;

// ============================================================================
// 工具类型推断 - File Package Tools
// ============================================================================
type SaveFileToolType = InferUITool<typeof saveFileTool>;
type SaveMultipleFilesToolType = InferUITool<typeof saveMultipleFilesTool>;
type CreateZipToolType = InferUITool<typeof createZipTool>;
type ListPackagesToolType = InferUITool<typeof listPackagesTool>;

// ============================================================================
// 聊天工具类型定义 - 包含所有可用工�?
// ============================================================================
export type ChatTools = {
    // A. Web Tools - 网络搜索和内容提�?
    tavilySearch: TavilySearchToolType;        // 实时网络搜索
    tavilyExtract: TavilyExtractToolType;      // URL 内容提取
    tavilyCrawl: TavilyCrawlToolType;          // 网站爬取
    tavilyMap: TavilyMapToolType;              // 网站结构映射
    
    // B. Artifact Tools - 代码工件管理（直接渲染）
    createArtifact: CreateArtifactToolType;    // 创建代码工件
    readArtifact: ReadArtifactToolType;        // 读取代码工件
    updateArtifact: UpdateArtifactToolType;    // 更新代码工件
    listArtifacts: ListArtifactsToolType;      // 列出所有工�?
    
    // C. Project File System - 项目文件系统操作（需�?projectId�?
    readProjectFiles: ReadProjectFilesToolType;      // 读取项目文件列表
    getProjectFile: GetProjectFileToolType;          // 获取单个文件内容
    existsProjectFile: ExistsProjectFileToolType;    // 检查文件是否存�?
    createProjectFile: CreateProjectFileToolType;    // 创建新文�?
    updateProjectFile: UpdateProjectFileToolType;    // 更新/覆盖文件
    patchProjectFile: PatchProjectFileToolType;      // 基于 diff 修改文件
    deleteProjectFile: DeleteProjectFileToolType;    // 删除文件
    getProjectInfo: GetProjectInfoToolType;          // 获取项目信息
    updateProjectInfo: UpdateProjectInfoToolType;    // 更新项目信息
    
    // D. Build & Dependency - 依赖管理和构建系统（需�?projectId�?
    addDependency: AddDependencyToolType;             // 添加依赖�?
    removeDependency: RemoveDependencyToolType;       // 移除依赖�?
    installDependencies: InstallDependenciesToolType; // 安装所有依�?
    runBuild: RunBuildToolType;                       // 运行构建命令
    runLint: RunLintToolType;                         // 运行代码检�?
    runFormat: RunFormatToolType;                     // 运行代码格式�?
    runScript: RunScriptToolType;                     // 运行 package.json 脚本
    
    // E. Runtime & Preview - 运行时和预览服务（需�?projectId�?
    startDevServer: StartDevServerToolType;           // 启动开发服务器
    startPreviewServer: StartPreviewServerToolType;   // 启动预览服务�?
    stopServer: StopServerToolType;                   // 停止服务�?
    proxyRequestToDevServer: ProxyRequestToDevServerToolType; // 代理请求到开发服务器
    getServerStatus: GetServerStatusToolType;         // 获取服务器状�?
    
    // F. DOM & Interaction - DOM 交互和页面检查（需�?projectId�?
    inspectDOM: InspectDOMToolType;                   // 检�?DOM 结构
    queryElement: QueryElementToolType;               // 查询单个元素
    queryElements: QueryElementsToolType;             // 查询多个元素
    captureScreenshot: CaptureScreenshotToolType;     // 整页截图
    captureElementScreenshot: CaptureElementScreenshotToolType; // 元素截图
    evaluateClientScript: EvaluateClientScriptToolType; // 执行客户端脚�?
    readClientState: ReadClientStateToolType;         // 读取客户端状�?
    
    // G. Observability - 运行时调试和监控（需�?projectId�?
    getConsoleLogs: GetConsoleLogsToolType;           // 获取控制台日�?
    clearConsoleLogs: ClearConsoleLogsToolType;       // 清空控制台日�?
    getNetworkRequests: GetNetworkRequestsToolType;   // 获取网络请求记录
    clearNetworkRequests: ClearNetworkRequestsToolType; // 清空网络请求记录
    getPerformanceMetrics: GetPerformanceMetricsToolType; // 获取性能指标
    
    // H. Diff / Patch / AST - 代码差异�?AST 操作（需�?projectId�?
    generateDiff: GenerateDiffToolType;               // 生成文件差异
    applyDiff: ApplyDiffToolType;                     // 应用差异补丁
    generateASTPatch: GenerateASTPatchToolType;       // 生成 AST 补丁
    
    // J. System & Security - 系统安全和资源管理（通用工具�?
    runSandboxedScript: RunSandboxedScriptToolType;   // 安全执行脚本
    getQuotaUsage: GetQuotaUsageToolType;             // 获取配额使用情况
    terminateTask: TerminateTaskToolType;             // 终止长任�?
    logEvent: LogEventToolType;                       // 记录事件
    createProject: CreateProjectToolType;             // 创建新项�?
    listProjects: ListProjectsToolType;               // 列出用户项目
    
    // File Package Tools - 文件打包和下�?
    saveFile: SaveFileToolType;                       // 保存单个文件
    saveMultipleFiles: SaveMultipleFilesToolType;     // 保存多个文件
    createZip: CreateZipToolType;                     // 创建 ZIP 压缩�?
    listPackages: ListPackagesToolType;               // 列出已打包文�?
}

// ============================================================================
// 消息元数据和自定义数据类�?
// ============================================================================
export const messageMetadataSchema = z.object({
    createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type CustomUIDataTypes = {
    textDelta: string;
    imageDelta: string;
    sheetDelta: string;
    codeDelta: string;
    appendMessage: string;
    id: string;
    title: string;
    clear: null;
    finish: null;
};

// ============================================================================
// 聊天消息类型定义
// ============================================================================
export type ChatMessage = UIMessage<
    MessageMetadata,
    CustomUIDataTypes,
    ChatTools
>;

// ============================================================================
// 附件类型定义
// ============================================================================
export type Attachment = {
    name: string;
    url: string;
    contentType: string;
};

