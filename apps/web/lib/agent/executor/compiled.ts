/**
 * Compiled language executor using Piston API
 * Supports: Java, Go, Rust, JavaScript, TypeScript, C, C++
 */

export interface ExecuteResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

interface PistonRunRequest {
  language: string;
  version: string;
  files: Array<{
    name?: string;
    content: string;
  }>;
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

interface PistonRunResponse {
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

// Language configuration mapping
const LANGUAGE_CONFIG: Record<
  string,
  { language: string; version: string; filename: string }
> = {
  java: { language: "java", version: "15.0.2", filename: "Main.java" },
  go: { language: "go", version: "1.16.2", filename: "main.go" },
  rust: { language: "rust", version: "1.68.2", filename: "main.rs" },
  javascript: { language: "javascript", version: "18.15.0", filename: "index.js" },
  typescript: { language: "typescript", version: "5.0.3", filename: "index.ts" },
  c: { language: "c", version: "10.2.0", filename: "main.c" },
  cpp: { language: "c++", version: "10.2.0", filename: "main.cpp" },
};

const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";

/**
 * Execute code using Piston API
 */
async function executePiston(
  code: string,
  lang: keyof typeof LANGUAGE_CONFIG
): Promise<ExecuteResult> {
  const startTime = performance.now();

  try {
    const config = LANGUAGE_CONFIG[lang];
    if (!config) {
      throw new Error(`Unsupported language: ${lang}`);
    }

    const payload: PistonRunRequest = {
      language: config.language,
      version: config.version,
      files: [
        {
          name: config.filename,
          content: code,
        },
      ],
      compile_timeout: 10000,
      run_timeout: 3000,
      compile_memory_limit: -1,
      run_memory_limit: -1,
    };

    const response = await fetch(PISTON_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const result: PistonRunResponse = await response.json();
    const executionTime = performance.now() - startTime;

    // Check compilation errors
    if (result.compile && result.compile.code !== 0) {
      return {
        success: false,
        output: result.compile.stdout || "",
        error: result.compile.stderr || result.compile.output || "Compilation failed",
        executionTime,
      };
    }

    // Check runtime errors
    const hasError = result.run.code !== 0 || result.run.stderr;
    const output = result.run.stdout || result.run.output || "";
    const error = result.run.stderr || undefined;

    return {
      success: !hasError,
      output: output || "(No output)",
      error,
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

// Export individual executor functions
export const executeJava = (code: string) => executePiston(code, "java");
export const executeGo = (code: string) => executePiston(code, "go");
export const executeRust = (code: string) => executePiston(code, "rust");
export const executeJavaScript = (code: string) => executePiston(code, "javascript");
export const executeTypeScript = (code: string) => executePiston(code, "typescript");
export const executeC = (code: string) => executePiston(code, "c");
export const executeCpp = (code: string) => executePiston(code, "cpp");
