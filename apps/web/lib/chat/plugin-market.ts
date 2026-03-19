import type { AgentCapabilityBoundarySnapshot } from "@z0/shared-types";
import type { SystemPluginMarketItem } from "./plugin-market-types";

export function toSystemPluginMarketItems(
  snapshot: AgentCapabilityBoundarySnapshot,
): SystemPluginMarketItem[] {
  return snapshot.pluginInventory.map((plugin) => ({
    pluginId: plugin.id,
    name: plugin.name,
    status: plugin.status,
    runtimeStatus: plugin.runtimeStatus,
    description: plugin.description,
    highlights: plugin.highlights,
    tools: plugin.tools,
    skills: plugin.skills,
    mcpServers: plugin.mcpServers,
    uiPanels: plugin.uiPanels,
    workflows: plugin.workflows,
    subagentRoles: plugin.subagentRoles,
    dependencies: plugin.dependencies,
  }));
}
