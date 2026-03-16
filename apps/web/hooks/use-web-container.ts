/**
 * React hook for using WebContainer
 * 
 * Provides a convenient way to access and manage WebContainer instances
 * in React components. Supports all tool operations:
 * - C. Project File System
 * - D. Build & Dependency
 * - E. Runtime & Preview
 * - G. Observability
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { WebContainer, FileSystemTree } from '@webcontainer/api';
import { 
  getWebContainerManager, 
  type FileInfo, 
  type ConsoleLogEntry, 
  type NetworkRequestEntry,
  type ProcessResult 
} from '@/lib/project/web-container-builder';

// ============================================================================
// Types
// ============================================================================

interface UseWebContainerOptions {
  projectId: string;
  autoInitialize?: boolean;
  onServerReady?: (url: string, port: number) => void;
  onConsoleLog?: (log: ConsoleLogEntry) => void;
}

interface UseWebContainerReturn {
  // State
  container: WebContainer | null;
  status: 'idle' | 'initializing' | 'ready' | 'error';
  error: Error | null;
  serverUrl: string | null;
  serverPort: number | null;
  isServerRunning: boolean;
  
  // Lifecycle
  initialize: () => Promise<void>;
  terminate: () => Promise<void>;
  
  // C. File System Operations
  readFiles: (path?: string, depth?: number) => Promise<FileInfo[]>;
  getFile: (filePath: string) => Promise<string>;
  fileExists: (filePath: string) => Promise<boolean>;
  createFile: (filePath: string, content: string) => Promise<void>;
  updateFile: (filePath: string, content: string, createIfNotExists?: boolean) => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
  mountFiles: (files: FileSystemTree) => Promise<void>;
  
  // D. Build & Dependency Operations
  runCommand: (command: string, args?: string[]) => Promise<ProcessResult>;
  addDependency: (packages: string[], dev?: boolean) => Promise<ProcessResult>;
  removeDependency: (packages: string[]) => Promise<ProcessResult>;
  installDependencies: () => Promise<ProcessResult>;
  runBuild: (mode?: 'production' | 'development') => Promise<ProcessResult>;
  runLint: (fix?: boolean, path?: string) => Promise<ProcessResult>;
  runFormat: (path?: string) => Promise<ProcessResult>;
  runScript: (script: string, args?: string[]) => Promise<ProcessResult>;
  
  // E. Runtime & Preview Operations
  startDevServer: (port?: number) => Promise<{ url: string; port: number }>;
  startPreviewServer: (port?: number) => Promise<{ url: string; port: number }>;
  stopServer: () => Promise<void>;
  getServerStatus: () => { running: boolean; url: string | null; port: number | null };
  
  // G. Observability Operations
  getConsoleLogs: (level?: 'all' | 'log' | 'warn' | 'error', limit?: number) => ConsoleLogEntry[];
  clearConsoleLogs: () => void;
  getNetworkRequests: (limit?: number, filter?: string) => NetworkRequestEntry[];
  clearNetworkRequests: () => void;
  
  // Stats
  getStats: () => {
    reuseCount: number;
    uptime: number;
    cacheSize: number;
    logCount: number;
    requestCount: number;
  } | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWebContainer({
  projectId,
  autoInitialize = true,
  onServerReady,
  onConsoleLog,
}: UseWebContainerOptions): UseWebContainerReturn {
  const [container, setContainer] = useState<WebContainer | null>(null);
  const [status, setStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [serverPort, setServerPort] = useState<number | null>(null);
  const [isServerRunning, setIsServerRunning] = useState(false);
  
  const onServerReadyRef = useRef(onServerReady);
  const onConsoleLogRef = useRef(onConsoleLog);
  
  // Update refs
  useEffect(() => {
    onServerReadyRef.current = onServerReady;
    onConsoleLogRef.current = onConsoleLog;
  }, [onServerReady, onConsoleLog]);

  // ============================================================================
  // Lifecycle
  // ============================================================================

  const initialize = useCallback(async () => {
    if (!projectId) {
      setError(new Error('Project ID is required'));
      setStatus('error');
      return;
    }

    setStatus('initializing');
    setError(null);

    try {
      const manager = getWebContainerManager();
      const instance = await manager.getOrCreateInstance(projectId);
      setContainer(instance);
      setStatus('ready');
      
      // Check if server is already running
      const serverStatus = manager.getServerStatus(projectId);
      setIsServerRunning(serverStatus.running);
      setServerUrl(serverStatus.url);
      setServerPort(serverStatus.port);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize WebContainer');
      setError(error);
      setStatus('error');
      console.error('WebContainer initialization error:', error);
    }
  }, [projectId]);

  const terminate = useCallback(async () => {
    if (!projectId) return;

    try {
      const manager = getWebContainerManager();
      await manager.terminateInstance(projectId);
      setContainer(null);
      setStatus('idle');
      setServerUrl(null);
      setServerPort(null);
      setIsServerRunning(false);
    } catch (err) {
      console.error('WebContainer termination error:', err);
    }
  }, [projectId]);

  // ============================================================================
  // C. File System Operations
  // ============================================================================

  const readFiles = useCallback(async (path?: string, depth?: number): Promise<FileInfo[]> => {
    const manager = getWebContainerManager();
    return manager.readProjectFiles(projectId, path, depth);
  }, [projectId]);

  const getFile = useCallback(async (filePath: string): Promise<string> => {
    const manager = getWebContainerManager();
    return manager.getProjectFile(projectId, filePath);
  }, [projectId]);

  const fileExists = useCallback(async (filePath: string): Promise<boolean> => {
    const manager = getWebContainerManager();
    return manager.existsProjectFile(projectId, filePath);
  }, [projectId]);

  const createFile = useCallback(async (filePath: string, content: string): Promise<void> => {
    const manager = getWebContainerManager();
    return manager.createProjectFile(projectId, filePath, content);
  }, [projectId]);

  const updateFile = useCallback(async (filePath: string, content: string, createIfNotExists = true): Promise<void> => {
    const manager = getWebContainerManager();
    return manager.updateProjectFile(projectId, filePath, content, createIfNotExists);
  }, [projectId]);

  const deleteFile = useCallback(async (filePath: string): Promise<void> => {
    const manager = getWebContainerManager();
    return manager.deleteProjectFile(projectId, filePath);
  }, [projectId]);

  const mountFiles = useCallback(async (files: FileSystemTree): Promise<void> => {
    const manager = getWebContainerManager();
    return manager.mountFiles(projectId, files);
  }, [projectId]);

  // ============================================================================
  // D. Build & Dependency Operations
  // ============================================================================

  const runCommand = useCallback(async (command: string, args: string[] = []): Promise<ProcessResult> => {
    const manager = getWebContainerManager();
    return manager.runCommand(projectId, command, args);
  }, [projectId]);

  const addDependency = useCallback(async (packages: string[], dev = false): Promise<ProcessResult> => {
    const manager = getWebContainerManager();
    return manager.addDependency(projectId, packages, dev);
  }, [projectId]);

  const removeDependency = useCallback(async (packages: string[]): Promise<ProcessResult> => {
    const manager = getWebContainerManager();
    return manager.removeDependency(projectId, packages);
  }, [projectId]);

  const installDependencies = useCallback(async (): Promise<ProcessResult> => {
    const manager = getWebContainerManager();
    return manager.installDependencies(projectId);
  }, [projectId]);

  const runBuild = useCallback(async (mode?: 'production' | 'development'): Promise<ProcessResult> => {
    const manager = getWebContainerManager();
    return manager.runBuild(projectId, mode);
  }, [projectId]);

  const runLint = useCallback(async (fix = false, path?: string): Promise<ProcessResult> => {
    const manager = getWebContainerManager();
    return manager.runLint(projectId, fix, path);
  }, [projectId]);

  const runFormat = useCallback(async (path?: string): Promise<ProcessResult> => {
    const manager = getWebContainerManager();
    return manager.runFormat(projectId, path);
  }, [projectId]);

  const runScript = useCallback(async (script: string, args: string[] = []): Promise<ProcessResult> => {
    const manager = getWebContainerManager();
    return manager.runScript(projectId, script, args);
  }, [projectId]);

  // ============================================================================
  // E. Runtime & Preview Operations
  // ============================================================================

  const startDevServer = useCallback(async (port = 3000): Promise<{ url: string; port: number }> => {
    const manager = getWebContainerManager();
    const result = await manager.startDevServer(projectId, port);
    
    setServerUrl(result.url);
    setServerPort(result.port);
    setIsServerRunning(true);
    
    onServerReadyRef.current?.(result.url, result.port);
    
    return result;
  }, [projectId]);

  const startPreviewServer = useCallback(async (port = 3000): Promise<{ url: string; port: number }> => {
    const manager = getWebContainerManager();
    const result = await manager.startPreviewServer(projectId, port);
    
    setServerUrl(result.url);
    setServerPort(result.port);
    setIsServerRunning(true);
    
    onServerReadyRef.current?.(result.url, result.port);
    
    return result;
  }, [projectId]);

  const stopServer = useCallback(async (): Promise<void> => {
    const manager = getWebContainerManager();
    await manager.stopServer(projectId);
    
    setServerUrl(null);
    setServerPort(null);
    setIsServerRunning(false);
  }, [projectId]);

  const getServerStatus = useCallback(() => {
    const manager = getWebContainerManager();
    return manager.getServerStatus(projectId);
  }, [projectId]);

  // ============================================================================
  // G. Observability Operations
  // ============================================================================

  const getConsoleLogs = useCallback((level?: 'all' | 'log' | 'warn' | 'error', limit = 50): ConsoleLogEntry[] => {
    const manager = getWebContainerManager();
    return manager.getConsoleLogs(projectId, level, limit);
  }, [projectId]);

  const clearConsoleLogs = useCallback((): void => {
    const manager = getWebContainerManager();
    manager.clearConsoleLogs(projectId);
  }, [projectId]);

  const getNetworkRequests = useCallback((limit = 20, filter?: string): NetworkRequestEntry[] => {
    const manager = getWebContainerManager();
    return manager.getNetworkRequests(projectId, limit, filter);
  }, [projectId]);

  const clearNetworkRequests = useCallback((): void => {
    const manager = getWebContainerManager();
    manager.clearNetworkRequests(projectId);
  }, [projectId]);

  // ============================================================================
  // Stats
  // ============================================================================

  const getStats = useCallback(() => {
    const manager = getWebContainerManager();
    return manager.getInstanceStats(projectId);
  }, [projectId]);

  // ============================================================================
  // Auto-initialize Effect
  // ============================================================================

  useEffect(() => {
    if (autoInitialize && projectId && status === 'idle') {
      initialize();
    }

    return () => {
      // Don't terminate on unmount to allow instance reuse
      // Instances will be cleaned up by the manager's idle timeout
    };
  }, [autoInitialize, projectId, status, initialize]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    container,
    status,
    error,
    serverUrl,
    serverPort,
    isServerRunning,
    
    // Lifecycle
    initialize,
    terminate,
    
    // C. File System
    readFiles,
    getFile,
    fileExists,
    createFile,
    updateFile,
    deleteFile,
    mountFiles,
    
    // D. Build & Dependency
    runCommand,
    addDependency,
    removeDependency,
    installDependencies,
    runBuild,
    runLint,
    runFormat,
    runScript,
    
    // E. Runtime & Preview
    startDevServer,
    startPreviewServer,
    stopServer,
    getServerStatus,
    
    // G. Observability
    getConsoleLogs,
    clearConsoleLogs,
    getNetworkRequests,
    clearNetworkRequests,
    
    // Stats
    getStats,
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for observing console logs in real-time
 */
export function useWebContainerLogs(projectId: string, pollInterval = 1000) {
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  
  useEffect(() => {
    if (!projectId) return;
    
    const manager = getWebContainerManager();
    
    const interval = setInterval(() => {
      const newLogs = manager.getConsoleLogs(projectId, 'all', 100);
      setLogs(newLogs);
    }, pollInterval);
    
    return () => clearInterval(interval);
  }, [projectId, pollInterval]);
  
  return logs;
}

/**
 * Hook for observing network requests in real-time
 */
export function useWebContainerNetwork(projectId: string, pollInterval = 1000) {
  const [requests, setRequests] = useState<NetworkRequestEntry[]>([]);
  
  useEffect(() => {
    if (!projectId) return;
    
    const manager = getWebContainerManager();
    
    const interval = setInterval(() => {
      const newRequests = manager.getNetworkRequests(projectId, 50);
      setRequests(newRequests);
    }, pollInterval);
    
    return () => clearInterval(interval);
  }, [projectId, pollInterval]);
  
  return requests;
}

/**
 * Hook for server status
 */
export function useWebContainerServer(projectId: string) {
  const [serverStatus, setServerStatus] = useState<{
    running: boolean;
    url: string | null;
    port: number | null;
  }>({ running: false, url: null, port: null });
  
  useEffect(() => {
    if (!projectId) return;
    
    const manager = getWebContainerManager();
    
    // Initial check
    setServerStatus(manager.getServerStatus(projectId));
    
    // Poll for changes
    const interval = setInterval(() => {
      setServerStatus(manager.getServerStatus(projectId));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [projectId]);
  
  return serverStatus;
}
