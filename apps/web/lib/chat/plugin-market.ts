import type { AgentCapabilityBoundarySnapshot } from "@z0/shared-types";
import type {
  SystemMcpMarketItem,
  SystemPluginMarketItem,
} from "./plugin-market-types";

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

export function isDirectSystemMcpMarketItem(item: SystemMcpMarketItem) {
  return !item.requiresSetup;
}

export function filterSystemMcpMarketItems(
  items: SystemMcpMarketItem[],
  params: {
    query: string;
    source: "all" | "system" | "market" | "external";
  },
) {
  const query = params.query.trim().toLowerCase();

  return items.filter((item) => {
    const sourceMatched =
      params.source === "all" ? true : item.sourceType === params.source;
    if (!sourceMatched) {
      return false;
    }

    if (query.length === 0) {
      return true;
    }

    return [
      item.name,
      item.endpoint,
      item.category,
      item.provider,
      item.shortDescription,
      ...item.tags,
    ].some((field) => field.toLowerCase().includes(query));
  });
}

export function groupSystemMcpMarketItems(items: SystemMcpMarketItem[]) {
  const groups: Record<string, Record<string, SystemMcpMarketItem[]>> = {
    system: {},
    market: {},
    external: {},
    other: {},
  };

  const sortedItems = [...items].sort((left, right) => {
    if (left.category !== right.category) {
      return left.category.localeCompare(right.category);
    }

    return left.name.localeCompare(right.name);
  });

  for (const item of sortedItems) {
    const sourceKey =
      item.sourceType === "system" ||
      item.sourceType === "market" ||
      item.sourceType === "external"
        ? item.sourceType
        : "other";
    const categoryKey = item.category;

    groups[sourceKey][categoryKey] ??= [];
    groups[sourceKey][categoryKey].push(item);
  }

  return groups;
}
