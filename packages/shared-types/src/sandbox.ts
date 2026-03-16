export type SandboxRuntime = "nodejs" | "python" | "rust";

export interface SandboxExecutionRequest {
  runtime: SandboxRuntime;
  entrypoint: string;
  args?: string[];
  env?: Record<string, string>;
  files?: Array<{
    path: string;
    content: string;
  }>;
  timeoutMs?: number;
}

export interface SandboxExecutionResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface SandboxHealthPayload {
  ok: true;
  service: "sandbox";
  version?: string;
}
