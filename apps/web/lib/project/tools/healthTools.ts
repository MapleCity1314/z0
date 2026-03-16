import { tool } from "ai";
import { z } from "zod";
import {
  TEMPLATE_REGISTRY_UPDATED_AT,
  TEMPLATE_STABLE_VERSIONS,
  validateTemplateRegistry,
} from "@/lib/project/templates/template-registry";

type HealthCheckStatus = "healthy" | "warning" | "failed";

type HealthCheckItem = {
  name: string;
  status: HealthCheckStatus;
  message: string;
  nextSteps?: string[];
};

function fail(name: string, message: string, nextSteps: string[]): HealthCheckItem {
  return {
    name,
    status: "failed",
    message,
    nextSteps,
  };
}

function warn(name: string, message: string, nextSteps: string[]): HealthCheckItem {
  return {
    name,
    status: "warning",
    message,
    nextSteps,
  };
}

function ok(name: string, message: string): HealthCheckItem {
  return {
    name,
    status: "healthy",
    message,
  };
}

export const checkProjectWorkspaceHealthTool = tool({
  description:
    "Check project workspace health for tool modules, DB connectivity, WebContainer runtime, and template registry validity.",
  inputSchema: z.object({
    includeDetails: z.boolean().optional().describe("Include detailed version metadata"),
  }),
  execute: async ({ includeDetails = true }) => {
    const checks: HealthCheckItem[] = [];

    try {
      const [{ db }, { sql }] = await Promise.all([
        import("@/lib/db"),
        import("drizzle-orm"),
      ]);
      await db.execute(sql`select 1`);
      checks.push(ok("database", "Database connection is healthy."));
    } catch (error) {
      checks.push(
        fail(
          "database",
          `Database check failed: ${error instanceof Error ? error.message : "unknown error"}`,
          ["Verify DATABASE_URL is set.", "Check database network access and credentials.", "Retry health check after DB recovery."],
        ),
      );
    }

    try {
      const webcontainerApi = await import("@webcontainer/api");
      const hasBoot = typeof webcontainerApi.WebContainer?.boot === "function";

      if (hasBoot) {
        checks.push(ok("webcontainer", "WebContainer API is available."));
      } else {
        checks.push(
          fail("webcontainer", "WebContainer API loaded but boot() is unavailable.", [
            "Verify @webcontainer/api installation.",
            "Check runtime environment supports WebContainer.",
          ]),
        );
      }
    } catch (error) {
      checks.push(
        fail(
          "webcontainer",
          `WebContainer check failed: ${error instanceof Error ? error.message : "unknown error"}`,
          ["Install @webcontainer/api and rebuild.", "Ensure server runtime can import WebContainer modules."],
        ),
      );
    }

    const templateValidation = validateTemplateRegistry();
    if (!templateValidation.valid) {
      checks.push(
        fail("template-registry", "Template registry has invalid entries.", templateValidation.errors),
      );
    } else {
      checks.push(
        ok(
          "template-registry",
          `Template registry is valid (updated at ${TEMPLATE_REGISTRY_UPDATED_AT}).`,
        ),
      );
    }

    try {
      const modules = await Promise.all([
        import("@/lib/project/tools/projectTools"),
        import("@/lib/project/tools/buildTools"),
        import("@/lib/project/tools/runtimeTools"),
        import("@/lib/project/tools/domTools"),
        import("@/lib/project/tools/observabilityTools"),
        import("@/lib/project/tools/diffTools"),
        import("@/lib/tools/systemTools"),
      ]);

      const brokenExports: string[] = [];
      for (const moduleRef of modules) {
        for (const [name, value] of Object.entries(moduleRef)) {
          if (!name.endsWith("Tool")) {
            continue;
          }

          const execute = (value as { execute?: unknown }).execute;
          if (typeof execute !== "function") {
            brokenExports.push(name);
          }
        }
      }

      if (brokenExports.length > 0) {
        checks.push(
          fail("tool-modules", `Some tool exports are missing execute(): ${brokenExports.join(", ")}`, [
            "Fix broken exports in listed tool modules.",
            "Re-run build and health check.",
          ]),
        );
      } else {
        checks.push(ok("tool-modules", "All tool exports expose execute() as expected."));
      }
    } catch (error) {
      checks.push(
        fail(
          "tool-modules",
          `Tool module import failed: ${error instanceof Error ? error.message : "unknown error"}`,
          ["Check import paths and compile errors in tool modules.", "Run TypeScript check before retry."],
        ),
      );
    }

    const failedCount = checks.filter((check) => check.status === "failed").length;
    const warningCount = checks.filter((check) => check.status === "warning").length;

    const success = failedCount === 0;

    return {
      success,
      toolName: "checkProjectWorkspaceHealth",
      summary: {
        status: success ? (warningCount > 0 ? "warning" : "healthy") : "failed",
        healthy: checks.filter((check) => check.status === "healthy").length,
        warning: warningCount,
        failed: failedCount,
      },
      checks,
      ...(includeDetails
        ? {
            details: {
              templateRegistryUpdatedAt: TEMPLATE_REGISTRY_UPDATED_AT,
              templateStableVersions: TEMPLATE_STABLE_VERSIONS,
            },
          }
        : {}),
      message: success
        ? "Workspace health check completed successfully."
        : "Workspace health check found recoverable issues.",
      nextSteps: success
        ? ["Proceed with tool execution and monitor health periodically."]
        : [
            "Resolve failed checks based on nextSteps in each check item.",
            "Re-run checkProjectWorkspaceHealth to confirm recovery.",
          ],
    };
  },
});
