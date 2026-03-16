/**
 * WebContainer Instance Manager
 * 
 * Manages WebContainer instances for projects, providing:
 * - Instance creation and initialization
 * - Instance lifecycle management
 * - File system synchronization
 * - Process management (dev server, build, etc.)
 * - Console/Network observability
 * - DOM inspection capabilities
 * 
 * Supports all tools in categories C, D, E, F, G, H
 */

import { WebContainer, FileSystemTree, WebContainerProcess } from '@webcontainer/api';

// ============================================================================
// Types
// ============================================================================

export interface WebContainerInstance {
  container: WebContainer;
  projectId: string;
  status: 'initializing' | 'ready' | 'error' | 'terminated';
  createdAt: Date;
  lastUsedAt: Date;
  reuseCount: number;
  buildCache: Map<string, { hash: string; timestamp: number }>;
  // Process management
  processes: Map<string, WebContainerProcess>;
  serverUrl: string | null;
  serverPort: number | null;
  // Observability
  consoleLogs: ConsoleLogEntry[];
  networkRequests: NetworkRequestEntry[];
}

export interface ConsoleLogEntry {
  id: string;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: number;
  source?: string;
}

export interface NetworkRequestEntry {
  id: string;
  url: string;
  method: string;
  status?: number;
  duration?: number;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
}

export interface FileInfo {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  content?: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  type: 'react' | 'vue' | 'nextjs' | 'vanilla' | 'unknown';
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
  entryFile?: string;
  scripts?: Record<string, string>;
}

export interface ProcessResult {
  exitCode: number;
  output: string;
}

// ============================================================================
// WebContainer Manager
// ============================================================================

class WebContainerManager {
  private instances: Map<string, WebContainerInstance> = new Map();
  private initializationPromises: Map<string, Promise<WebContainer>> = new Map();
  
  // ============================================================================
  // Instance Management
  // ============================================================================
  
  /**
   * Get or create a WebContainer instance for a project
   */
  async getOrCreateInstance(projectId: string): Promise<WebContainer> {
    const existing = this.instances.get(projectId);
    if (existing) {
      existing.lastUsedAt = new Date();
      
      if (existing.status === 'ready') {
        existing.reuseCount++;
        console.log(`[WebContainer] Reusing instance for project ${projectId} (reuse count: ${existing.reuseCount})`);
        return existing.container;
      }
      
      if (existing.status === 'error') {
        console.log(`[WebContainer] Removing failed instance for project ${projectId}`);
        this.instances.delete(projectId);
      }
    }
    
    const initPromise = this.initializationPromises.get(projectId);
    if (initPromise) {
      console.log(`[WebContainer] Waiting for initialization in progress for project ${projectId}`);
      return initPromise;
    }
    
    console.log(`[WebContainer] Creating new instance for project ${projectId}`);
    const promise = this.createInstance(projectId);
    this.initializationPromises.set(projectId, promise);
    
    try {
      const container = await promise;
      return container;
    } finally {
      this.initializationPromises.delete(projectId);
    }
  }
  
  private async createInstance(projectId: string): Promise<WebContainer> {
    try {
      const instance: WebContainerInstance = {
        container: null as unknown as WebContainer,
        projectId,
        status: 'initializing',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        reuseCount: 0,
        buildCache: new Map(),
        processes: new Map(),
        serverUrl: null,
        serverPort: null,
        consoleLogs: [],
        networkRequests: [],
      };
      
      this.instances.set(projectId, instance);
      
      const startTime = Date.now();
      const container = await WebContainer.boot();
      const bootTime = Date.now() - startTime;
      
      console.log(`[WebContainer] Booted in ${bootTime}ms for project ${projectId}`);
      
      instance.container = container;
      instance.status = 'ready';
      
      return container;
    } catch (error) {
      const instance = this.instances.get(projectId);
      if (instance) {
        instance.status = 'error';
      }
      
      throw new Error(`Failed to initialize WebContainer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  getInstance(projectId: string): WebContainerInstance | null {
    const instance = this.instances.get(projectId);
    if (instance && instance.status === 'ready') {
      instance.lastUsedAt = new Date();
      return instance;
    }
    return null;
  }
  
  getStatus(projectId: string): WebContainerInstance['status'] | null {
    const instance = this.instances.get(projectId);
    return instance ? instance.status : null;
  }
  
  async terminateInstance(projectId: string): Promise<void> {
    const instance = this.instances.get(projectId);
    if (!instance) return;
    
    try {
      // Kill all processes
      for (const [name, process] of instance.processes) {
        try {
          process.kill();
          console.log(`[WebContainer] Killed process: ${name}`);
        } catch (e) {
          console.error(`[WebContainer] Failed to kill process ${name}:`, e);
        }
      }
      
      if (instance.container && instance.status === 'ready') {
        instance.container.teardown();
      }
    } catch (error) {
      console.error(`Error terminating WebContainer for project ${projectId}:`, error);
    } finally {
      instance.status = 'terminated';
      this.instances.delete(projectId);
    }
  }
  
  // ============================================================================
  // C. Project File System Operations
  // ============================================================================
  
  /**
   * C1. Read project files (directory tree)
   */
  async readProjectFiles(projectId: string, path?: string, depth?: number): Promise<FileInfo[]> {
    const instance = this.getInstance(projectId);
    if (!instance) throw new Error('WebContainer not initialized');
    
    const targetPath = path || '/';
    const files: FileInfo[] = [];
    
    const readDir = async (dirPath: string, currentDepth: number) => {
      if (depth !== undefined && currentDepth > depth) return;
      
      try {
        const entries = await instance.container.fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`;
          
          if (entry.isDirectory()) {
            files.push({ path: fullPath, type: 'directory' });
            await readDir(fullPath, currentDepth + 1);
          } else {
            files.push({ path: fullPath, type: 'file' });
          }
        }
      } catch (e) {
        console.error(`[WebContainer] Error reading directory ${dirPath}:`, e);
      }
    };
    
    await readDir(targetPath, 0);
    return files;
  }
  
  /**
   * C1. Get single file content
   */
  async getProjectFile(projectId: string, filePath: string): Promise<string> {
    const instance = this.getInstance(projectId);
    if (!instance) throw new Error('WebContainer not initialized');
    
    const content = await instance.container.fs.readFile(filePath, 'utf-8');
    return content;
  }
  
  /**
   * C1. Check if file exists
   */
  async existsProjectFile(projectId: string, filePath: string): Promise<boolean> {
    const instance = this.getInstance(projectId);
    if (!instance) throw new Error('WebContainer not initialized');
    
    try {
      await instance.container.fs.readFile(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * C2. Create new file
   */
  async createProjectFile(projectId: string, filePath: string, content: string): Promise<void> {
    const instance = this.getInstance(projectId);
    if (!instance) throw new Error('WebContainer not initialized');
    
    // Ensure parent directory exists
    const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (parentDir) {
      await this.ensureDirectory(projectId, parentDir);
    }
    
    await instance.container.fs.writeFile(filePath, content);
    console.log(`[WebContainer] Created file: ${filePath}`);
  }
  
  /**
   * C2. Update/overwrite file
   */
  async updateProjectFile(projectId: string, filePath: string, content: string, createIfNotExists = true): Promise<void> {
    const instance = this.getInstance(projectId);
    if (!instance) throw new Error('WebContainer not initialized');
    
    const exists = await this.existsProjectFile(projectId, filePath);
    if (!exists && !createIfNotExists) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    if (!exists) {
      await this.createProjectFile(projectId, filePath, content);
    } else {
      await instance.container.fs.writeFile(filePath, content);
      console.log(`[WebContainer] Updated file: ${filePath}`);
    }
  }
  
  /**
   * C2. Delete file
   */
  async deleteProjectFile(projectId: string, filePath: string): Promise<void> {
    const instance = this.getInstance(projectId);
    if (!instance) throw new Error('WebContainer not initialized');
    
    await instance.container.fs.rm(filePath, { recursive: true });
    console.log(`[WebContainer] Deleted: ${filePath}`);
  }
  
  /**
   * Helper: Ensure directory exists
   */
  private async ensureDirectory(projectId: string, dirPath: string): Promise<void> {
    const instance = this.getInstance(projectId);
    if (!instance) throw new Error('WebContainer not initialized');
    
    const parts = dirPath.split('/').filter(Boolean);
    let currentPath = '';
    
    for (const part of parts) {
      currentPath += `/${part}`;
      try {
        await instance.container.fs.readdir(currentPath);
      } catch {
        await instance.container.fs.mkdir(currentPath);
      }
    }
  }
  
  /**
   * Mount file system tree (for initial project setup)
   */
  async mountFiles(projectId: string, files: FileSystemTree): Promise<void> {
    const instance = this.getInstance(projectId);
    if (!instance) throw new Error('WebContainer not initialized');
    
    await instance.container.mount(files);
    console.log(`[WebContainer] Mounted files for project ${projectId}`);
  }
  
  // ============================================================================
  // D. Build & Dependency Operations
  // ============================================================================
  
  /**
   * D. Run shell command and return result
   */
  async runCommand(projectId: string, command: string, args: string[] = []): Promise<ProcessResult> {
    const instance = this.getInstance(projectId);
    if (!instance) throw new Error('WebContainer not initialized');
    
    console.log(`[WebContainer] Running: ${command} ${args.join(' ')}`);
    
    const process = await instance.container.spawn(command, args);
    
    let output = '';
    
    process.output.pipeTo(new WritableStream({
      write(chunk) {
        output += chunk;
        // Add to console logs
        instance.consoleLogs.push({
          id: crypto.randomUUID(),
          level: 'log',
          message: chunk,
          timestamp: Date.now(),
          source: command,
        });
      }
    }));
    
    const exitCode = await process.exit;
    
    return { exitCode, output };
  }
  
  /**
   * D. Add dependency
   */
  async addDependency(projectId: string, packages: string[], dev = false): Promise<ProcessResult> {
    const args = ['install', ...packages];
    if (dev) args.push('-D');
    return this.runCommand(projectId, 'npm', args);
  }
  
  /**
   * D. Remove dependency
   */
  async removeDependency(projectId: string, packages: string[]): Promise<ProcessResult> {
    return this.runCommand(projectId, 'npm', ['uninstall', ...packages]);
  }
  
  /**
   * D. Install all dependencies
   */
  async installDependencies(projectId: string): Promise<ProcessResult> {
    return this.runCommand(projectId, 'npm', ['install']);
  }
  
  /**
   * D. Run build
   */
  async runBuild(projectId: string, mode?: 'production' | 'development'): Promise<ProcessResult> {
    const args = ['run', 'build'];
    if (mode) {
      args.push('--mode', mode);
    }
    return this.runCommand(projectId, 'npm', args);
  }
  
  /**
   * D. Run lint
   */
  async runLint(projectId: string, fix = false, path?: string): Promise<ProcessResult> {
    const args = ['run', 'lint'];
    if (fix) args.push('--', '--fix');
    if (path) args.push('--', path);
    return this.runCommand(projectId, 'npm', args);
  }
  
  /**
   * D. Run format
   */
  async runFormat(projectId: string, path?: string): Promise<ProcessResult> {
    const args = ['run', 'format'];
    if (path) args.push('--', path);
    return this.runCommand(projectId, 'npm', args);
  }
  
  /**
   * D. Run script from package.json
   */
  async runScript(projectId: string, script: string, scriptArgs: string[] = []): Promise<ProcessResult> {
    return this.runCommand(projectId, 'npm', ['run', script, ...scriptArgs]);
  }
  
  // ============================================================================
  // E. Runtime & Preview Operations
  // ============================================================================
  
  /**
   * E. Start dev server
   */
  async startDevServer(projectId: string, port = 3000): Promise<{ url: string; port: number }> {
    const instance = this.getInstance(projectId);
    if (!instance) throw new Error('WebContainer not initialized');
    
    // Kill existing server if any
    await this.stopServer(projectId);
    
    console.log(`[WebContainer] Starting dev server on port ${port}`);
    
    const process = await instance.container.spawn('npm', ['run', 'dev']);
    instance.processes.set('dev-server', process);
    
    // Capture output
    process.output.pipeTo(new WritableStream({
      write(chunk) {
        instance.consoleLogs.push({
          id: crypto.randomUUID(),
          level: 'log',
          message: chunk,
          timestamp: Date.now(),
          source: 'dev-server',
        });
      }
    }));
    
    // Wait for server-ready event
    return new Promise((resolve) => {
      instance.container.on('server-ready', (serverPort, url) => {
        instance.serverUrl = url;
        instance.serverPort = serverPort;
        console.log(`[WebContainer] Dev server ready at ${url}`);
        resolve({ url, port: serverPort });
      });
    });
  }
  
  /**
   * E. Start preview server (production build)
   */
  async startPreviewServer(projectId: string, port = 3000): Promise<{ url: string; port: number }> {
    const instance = this.getInstance(projectId);
    if (!instance) throw new Error('WebContainer not initialized');
    
    await this.stopServer(projectId);
    
    // First build
    await this.runBuild(projectId, 'production');
    
    console.log(`[WebContainer] Starting preview server on port ${port}`);
    
    const process = await instance.container.spawn('npm', ['run', 'preview']);
    instance.processes.set('preview-server', process);
    
    return new Promise((resolve) => {
      instance.container.on('server-ready', (serverPort, url) => {
        instance.serverUrl = url;
        instance.serverPort = serverPort;
        console.log(`[WebContainer] Preview server ready at ${url}`);
        resolve({ url, port: serverPort });
      });
    });
  }
  
  /**
   * E. Stop server
   */
  async stopServer(projectId: string): Promise<void> {
    const instance = this.getInstance(projectId);
    if (!instance) return;
    
    const devServer = instance.processes.get('dev-server');
    const previewServer = instance.processes.get('preview-server');
    
    if (devServer) {
      devServer.kill();
      instance.processes.delete('dev-server');
    }
    
    if (previewServer) {
      previewServer.kill();
      instance.processes.delete('preview-server');
    }
    
    instance.serverUrl = null;
    instance.serverPort = null;
    
    console.log(`[WebContainer] Server stopped for project ${projectId}`);
  }
  
  /**
   * E. Get server status
   */
  getServerStatus(projectId: string): { running: boolean; url: string | null; port: number | null } {
    const instance = this.getInstance(projectId);
    if (!instance) {
      return { running: false, url: null, port: null };
    }
    
    const hasServer = instance.processes.has('dev-server') || instance.processes.has('preview-server');
    
    return {
      running: hasServer,
      url: instance.serverUrl,
      port: instance.serverPort,
    };
  }
  
  // ============================================================================
  // G. Observability Operations
  // ============================================================================
  
  /**
   * G. Get console logs
   */
  getConsoleLogs(projectId: string, level?: 'all' | 'log' | 'warn' | 'error', limit = 50): ConsoleLogEntry[] {
    const instance = this.getInstance(projectId);
    if (!instance) return [];
    
    let logs = instance.consoleLogs;
    
    if (level && level !== 'all') {
      logs = logs.filter(log => log.level === level);
    }
    
    return logs.slice(-limit);
  }
  
  /**
   * G. Clear console logs
   */
  clearConsoleLogs(projectId: string): void {
    const instance = this.getInstance(projectId);
    if (instance) {
      instance.consoleLogs = [];
      console.log(`[WebContainer] Cleared console logs for project ${projectId}`);
    }
  }
  
  /**
   * G. Get network requests
   */
  getNetworkRequests(projectId: string, limit = 20, filter?: string): NetworkRequestEntry[] {
    const instance = this.getInstance(projectId);
    if (!instance) return [];
    
    let requests = instance.networkRequests;
    
    if (filter) {
      requests = requests.filter(req => req.url.includes(filter));
    }
    
    return requests.slice(-limit);
  }
  
  /**
   * G. Clear network requests
   */
  clearNetworkRequests(projectId: string): void {
    const instance = this.getInstance(projectId);
    if (instance) {
      instance.networkRequests = [];
      console.log(`[WebContainer] Cleared network requests for project ${projectId}`);
    }
  }
  
  /**
   * G. Add network request (called from preview iframe)
   */
  addNetworkRequest(projectId: string, request: Omit<NetworkRequestEntry, 'id' | 'timestamp'>): void {
    const instance = this.getInstance(projectId);
    if (instance) {
      instance.networkRequests.push({
        ...request,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      });
    }
  }
  
  // ============================================================================
  // Build Cache Operations
  // ============================================================================
  
  getBuildCache(projectId: string): Map<string, { hash: string; timestamp: number }> | undefined {
    const instance = this.instances.get(projectId);
    return instance?.buildCache;
  }
  
  updateBuildCache(projectId: string, filePath: string, hash: string): void {
    const instance = this.instances.get(projectId);
    if (instance?.buildCache) {
      instance.buildCache.set(filePath, { hash, timestamp: Date.now() });
    }
  }
  
  clearBuildCache(projectId: string): void {
    const instance = this.instances.get(projectId);
    if (instance?.buildCache) {
      instance.buildCache.clear();
      console.log(`[WebContainer] Cleared build cache for project ${projectId}`);
    }
  }
  
  // ============================================================================
  // Cleanup Operations
  // ============================================================================
  
  async cleanupIdleInstances(maxIdleTimeMs = 30 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const projectsToCleanup: string[] = [];
    
    this.instances.forEach((instance, projectId) => {
      const idleTime = now - instance.lastUsedAt.getTime();
      if (idleTime > maxIdleTimeMs) {
        projectsToCleanup.push(projectId);
      }
    });
    
    await Promise.all(
      projectsToCleanup.map(projectId => this.terminateInstance(projectId))
    );
  }
  
  getActiveInstances(): Array<{ projectId: string; status: string; createdAt: Date; lastUsedAt: Date }> {
    return Array.from(this.instances.values()).map(instance => ({
      projectId: instance.projectId,
      status: instance.status,
      createdAt: instance.createdAt,
      lastUsedAt: instance.lastUsedAt,
    }));
  }
  
  async terminateAll(): Promise<void> {
    const projectIds = Array.from(this.instances.keys());
    await Promise.all(
      projectIds.map(projectId => this.terminateInstance(projectId))
    );
  }
  
  getInstanceStats(projectId: string): {
    reuseCount: number;
    uptime: number;
    cacheSize: number;
    logCount: number;
    requestCount: number;
  } | null {
    const instance = this.instances.get(projectId);
    if (!instance) return null;
    
    return {
      reuseCount: instance.reuseCount,
      uptime: Date.now() - instance.createdAt.getTime(),
      cacheSize: instance.buildCache?.size ?? 0,
      logCount: instance.consoleLogs.length,
      requestCount: instance.networkRequests.length,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let managerInstance: WebContainerManager | null = null;

export function getWebContainerManager(): WebContainerManager {
  if (!managerInstance) {
    managerInstance = new WebContainerManager();
    
    if (typeof window !== 'undefined') {
      setInterval(() => {
        managerInstance?.cleanupIdleInstances();
      }, 10 * 60 * 1000);
    }
  }
  
  return managerInstance;
}

export function resetWebContainerManager(): void {
  if (managerInstance) {
    managerInstance.terminateAll();
    managerInstance = null;
  }
}

export { WebContainerManager };
