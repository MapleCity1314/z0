import { describe, expect, it } from "vitest";
import { getAgentCapabilityBoundarySnapshot } from "./plugin-boundary";

describe("agent capability boundary snapshot", () => {
  it("captures stable core seams and planned plugin manifests", () => {
    const snapshot = getAgentCapabilityBoundarySnapshot();

    expect(snapshot.contractVersion).toBe("2026-03-core-plugin-boundary-v1");
    expect(snapshot.coreCapabilities).toHaveLength(5);
    expect(snapshot.pluginManifests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "@z0/plugin-project" }),
        expect.objectContaining({ id: "@z0/plugin-search" }),
        expect.objectContaining({ id: "@z0/plugin-subagents" }),
      ]),
    );
  });

  it("maps current tool inventory to target ownership without changing runtime ownership", () => {
    const snapshot = getAgentCapabilityBoundarySnapshot();
    const coreOwnedTargets = snapshot.toolOwnership.filter(
      (tool: (typeof snapshot.toolOwnership)[number]) => tool.targetOwner === "core",
    );
    const pluginProjectTargets = snapshot.toolOwnership.filter(
      (tool: (typeof snapshot.toolOwnership)[number]) =>
        tool.targetPluginId === "@z0/plugin-project",
    );
    const pluginSearchTargets = snapshot.toolOwnership.filter(
      (tool: (typeof snapshot.toolOwnership)[number]) =>
        tool.targetPluginId === "@z0/plugin-search",
    );

    expect(snapshot.toolOwnership).toHaveLength(61);
    expect(coreOwnedTargets).toHaveLength(16);
    expect(pluginProjectTargets).toHaveLength(41);
    expect(pluginSearchTargets).toHaveLength(4);
    expect(
      pluginProjectTargets.find(
        (tool: (typeof snapshot.toolOwnership)[number]) =>
          tool.toolName === "generateDiff",
      ),
    ).toMatchObject({
      migrationStage: "plugin-skill-candidate",
      currentOwner: "core",
    });
  });
});
