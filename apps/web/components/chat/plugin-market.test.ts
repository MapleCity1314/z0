import { describe, expect, it } from "vitest";
import { getAgentCapabilityBoundarySnapshot } from "@z0/backend";
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
          highlights: expect.arrayContaining([
            "Project lifecycle and workspace management",
          ]),
          uiPanels: expect.arrayContaining(["project-workspace"]),
        }),
        expect.objectContaining({
          pluginId: "@z0/plugin-search",
          mcpServers: expect.arrayContaining(["research-providers"]),
        }),
        expect.objectContaining({
          pluginId: "@z0/plugin-subagents",
          subagentRoles: expect.arrayContaining(["frontend-reviewer"]),
        }),
      ]),
    );
  });
});
