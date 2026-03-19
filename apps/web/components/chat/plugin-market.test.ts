import { describe, expect, it } from "vitest";
import { getAgentCapabilityBoundarySnapshot } from "@z0/backend/agent/plugin-boundary";
import { toSystemPluginMarketItems } from "./plugin-market";

describe("toSystemPluginMarketItems", () => {
  it("maps backend plugin manifests into the composer plugin market shape", () => {
    const items = toSystemPluginMarketItems(
      getAgentCapabilityBoundarySnapshot(),
    );

    expect(items).toHaveLength(7);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pluginId: "@z0/plugin-project",
          name: "Project and Agentic Dev Sandbox",
          status: "planned",
          runtimeStatus: "not-mounted",
          highlights: expect.arrayContaining([
            "Project lifecycle and workspace management",
          ]),
          uiPanels: expect.arrayContaining(["project-workspace"]),
        }),
        expect.objectContaining({
          pluginId: "@z0/plugin-search",
          runtimeStatus: "not-mounted",
          mcpServers: expect.arrayContaining(["research-providers"]),
        }),
        expect.objectContaining({
          pluginId: "@z0/plugin-subagents",
          runtimeStatus: "not-mounted",
          subagentRoles: expect.arrayContaining(["frontend-reviewer"]),
        }),
      ]),
    );
  });
});
