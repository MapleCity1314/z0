import { describe, expect, it } from "vitest";
import type { SystemMcpMarketItem } from "./plugin-market-types";
import { getAgentCapabilityBoundarySnapshot } from "@z0/backend/agent/plugin-boundary";
import {
  filterSystemMcpMarketItems,
  groupSystemMcpMarketItems,
  isDirectSystemMcpMarketItem,
  toSystemPluginMarketItems,
} from "./plugin-market";

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

describe("system MCP market helpers", () => {
  const fixtures: SystemMcpMarketItem[] = [
    {
      systemServerId: "market-1",
      name: "Notion",
      endpoint: "setup://notion",
      sourceType: "market",
      slug: "notion",
      icon: "notion",
      category: "Knowledge Base",
      provider: "Notion",
      shortDescription: "Search and update workspace pages.",
      setupLabel: "Requires external setup",
      docsUrl: "https://www.notion.so/product",
      tags: ["docs", "wiki"],
      recommended: true,
      requiresSetup: true,
      requiresAuth: true,
      authProvider: "notion",
      privacyLevel: "high",
      consentRequired: true,
      scopes: [],
    },
    {
      systemServerId: "market-2",
      name: "GitHub",
      endpoint: "https://example.com/github/mcp",
      sourceType: "market",
      slug: "github",
      icon: "github",
      category: "Code Hosting",
      provider: "GitHub",
      shortDescription: "Repository, issue, and PR tools.",
      setupLabel: "Quick add",
      docsUrl: "https://github.com",
      tags: ["repo", "pull request"],
      recommended: true,
      requiresSetup: false,
      requiresAuth: true,
      authProvider: "github",
      privacyLevel: "high",
      consentRequired: true,
      scopes: ["read:user", "repo"],
    },
  ];

  it("matches query across category, provider, description, and tags", () => {
    expect(
      filterSystemMcpMarketItems(fixtures, {
        query: "wiki",
        source: "all",
      }),
    ).toEqual([fixtures[0]]);
    expect(
      filterSystemMcpMarketItems(fixtures, {
        query: "code hosting",
        source: "all",
      }),
    ).toEqual([fixtures[1]]);
  });

  it("groups items by source and category", () => {
    expect(groupSystemMcpMarketItems(fixtures)).toEqual({
      system: {},
      market: {
        "Code Hosting": [fixtures[1]],
        "Knowledge Base": [fixtures[0]],
      },
      external: {},
      other: {},
    });
  });

  it("treats setup-required items as non-direct connectors", () => {
    expect(isDirectSystemMcpMarketItem(fixtures[0])).toBe(false);
    expect(isDirectSystemMcpMarketItem(fixtures[1])).toBe(true);
  });
});
