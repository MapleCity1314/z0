import test from "node:test";
import assert from "node:assert/strict";
import { withSemanticToolGuard } from "@/lib/agent/tool-guards";

test("withSemanticToolGuard converts thrown errors to semantic payload", async () => {
  const tool = {
    description: "test",
    inputSchema: null,
    execute: async () => {
      throw new Error("database disconnected");
    },
  };

  const wrapped = withSemanticToolGuard("dbProbe", tool);
  const result = (await (wrapped as any).execute({}, {})) as Record<string, unknown>;

  assert.equal(result.success, false);
  assert.equal(result.toolName, "dbProbe");
  assert.equal(result.code, "database_unavailable");
  assert.equal(typeof result.message, "string");
  assert.equal(Array.isArray(result.nextSteps), true);
});

test("withSemanticToolGuard enriches non-throwing failure payloads", async () => {
  const tool = {
    description: "test",
    inputSchema: null,
    execute: async () => ({ success: false, message: "No project associated with this conversation" }),
  };

  const wrapped = withSemanticToolGuard("readProjectFiles", tool);
  const result = (await (wrapped as any).execute({}, {})) as Record<string, unknown>;

  assert.equal(result.success, false);
  assert.equal(result.code, "project_context_missing");
  assert.equal(Array.isArray(result.nextSteps), true);
});
