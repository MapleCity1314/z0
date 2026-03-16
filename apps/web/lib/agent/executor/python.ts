/**
 * Python code executor using Pyodide (WebAssembly-based Python runtime)
 * Provides a secure sandbox environment for executing Python code in the browser
 */

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackagesFromImports: (code: string) => Promise<void>;
}

let pyodide: PyodideInterface | null = null;
let loadingPromise: Promise<PyodideInterface> | null = null;

declare global {
  interface Window {
    loadPyodide: () => Promise<PyodideInterface>;
  }
}

/**
 * Load Pyodide runtime (lazy loading)
 */
async function loadPyodideRuntime(): Promise<PyodideInterface> {
  if (pyodide) return pyodide;

  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    // Dynamically load Pyodide script
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide"));
        document.head.appendChild(script);
      });
    }

    pyodide = await window.loadPyodide();
    return pyodide;
  })();

  return loadingPromise;
}

export interface ExecuteResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

/**
 * Execute Python code in a sandboxed environment
 */
export async function executePython(code: string): Promise<ExecuteResult> {
  const startTime = performance.now();

  try {
    const py = await loadPyodideRuntime();

    // Capture stdout/stderr
    await py.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
    `);

    // Load required packages
    await py.loadPackagesFromImports(code);

    // Execute user code
    await py.runPythonAsync(code);

    // Get output
    const stdout = await py.runPythonAsync("sys.stdout.getvalue()");
    const stderr = await py.runPythonAsync("sys.stderr.getvalue()");

    const executionTime = performance.now() - startTime;

    const output = String(stdout || "");
    const error = String(stderr || "");

    return {
      success: !error,
      output: output || "(No output)",
      error: error || undefined,
      executionTime,
    };
  } catch (err) {
    const executionTime = performance.now() - startTime;
    return {
      success: false,
      output: "",
      error: err instanceof Error ? err.message : String(err),
      executionTime,
    };
  }
}
