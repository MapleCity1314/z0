type SemanticToolError = {
  success: false;
  toolName: string;
  code: string;
  message: string;
  detail?: string;
  recoverable: true;
  nextSteps: string[];
};

function inferErrorCode(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("auth")
  ) {
    return "auth_required";
  }

  if (normalized.includes("project") && normalized.includes("no project")) {
    return "project_context_missing";
  }

  if (
    normalized.includes("webcontainer") &&
    (normalized.includes("not initialized") || normalized.includes("instance"))
  ) {
    return "webcontainer_unavailable";
  }

  if (normalized.includes("database") || normalized.includes("db")) {
    return "database_unavailable";
  }

  return "tool_execution_failed";
}

function buildNextSteps(code: string, toolName: string): string[] {
  switch (code) {
    case "auth_required":
      return [
        "Sign in and retry the tool.",
        "If the issue persists, refresh the session and run the command again.",
      ];
    case "project_context_missing":
      return [
        "Run `listProjects` to pick an existing project ID.",
        "Or run `createProject` first, then retry this tool.",
      ];
    case "webcontainer_unavailable":
      return [
        "Run `getProjectInfo` to verify the target project exists.",
        "Run `startDevServer` or initialize runtime tools, then retry.",
      ];
    case "database_unavailable":
      return [
        "Verify `DATABASE_URL` and database connectivity.",
        "Run health checks, then retry once DB is reachable.",
      ];
    default:
      return [
        `Review the error detail and adjust parameters for \`${toolName}\`.`,
        "Retry the tool or run a health check to isolate root cause.",
      ];
  }
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  return "Tool execution failed";
}

function toSemanticToolError(toolName: string, error: unknown): SemanticToolError {
  const detail = normalizeErrorMessage(error);
  const code = inferErrorCode(detail);

  return {
    success: false,
    toolName,
    code,
    message: `\`${toolName}\` failed: ${detail}`,
    detail,
    recoverable: true,
    nextSteps: buildNextSteps(code, toolName),
  };
}

function enrichFailureResult(toolName: string, result: Record<string, unknown>) {
  if (result.success !== false) {
    return result;
  }

  const detail =
    typeof result.message === "string" && result.message.length > 0
      ? result.message
      : "Tool returned failure";
  const code = inferErrorCode(detail);

  return {
    ...result,
    toolName: typeof result.toolName === "string" ? result.toolName : toolName,
    code: typeof result.code === "string" ? result.code : code,
    recoverable: true,
    nextSteps: Array.isArray(result.nextSteps)
      ? result.nextSteps
      : buildNextSteps(code, toolName),
  };
}

export function withSemanticToolGuard<T extends ToolLike>(
  toolName: string,
  tool: T,
  contextAugment?: (context: unknown) => unknown,
): T {
  const originalExecute = (tool as { execute?: unknown }).execute;
  if (typeof originalExecute !== "function") {
    return tool;
  }

  const wrappedExecute = async (...args: unknown[]) => {
    try {
      const input = args[0];
      const context = args[1];
      const enhancedContext = contextAugment ? contextAugment(context) : context;
      const result = (await (originalExecute as (...innerArgs: unknown[]) => unknown)(
        input,
        enhancedContext,
      )) as unknown;

      if (result && typeof result === "object") {
        return enrichFailureResult(toolName, result as Record<string, unknown>);
      }

      return result;
    } catch (error) {
      return toSemanticToolError(toolName, error);
    }
  };

  return {
    ...tool,
    execute: wrappedExecute as T["execute"],
  };
}

export function guardToolSet<T extends Record<string, unknown>>(tools: T): T {
  const guardedEntries = Object.entries(tools).map(([toolName, tool]) => [
    toolName,
    withSemanticToolGuard(toolName, tool as { execute?: unknown }),
  ]);

  return Object.fromEntries(guardedEntries) as T;
}
type ToolLike = Record<string, unknown> & {
  execute?: unknown;
};
