import { describe, expect, it } from "vitest";
import {
  isDirectSystemMcpEndpoint,
  mapSystemMcpMarketItem,
} from "./mcp-market";

describe("mapSystemMcpMarketItem", () => {
  it("maps metadata-driven market fields into the API dto", () => {
    const item = mapSystemMcpMarketItem({
      systemServerId: "mcp-1",
      name: "Notion",
      endpoint: "setup://notion",
      sourceType: "market",
      metadata: {
        slug: "notion",
        icon: "notion",
        category: "Knowledge Base",
        provider: "Notion",
        shortDescription: "Search and update workspace pages.",
        setupLabel: "Bring your own MCP endpoint",
        docsUrl: "https://www.notion.so/product",
        tags: ["docs", "wiki"],
        recommended: true,
      },
    });

    expect(item).toEqual({
      systemServerId: "mcp-1",
      name: "Notion",
      endpoint: "setup://notion",
      sourceType: "market",
      slug: "notion",
      icon: "notion",
      category: "Knowledge Base",
      provider: "Notion",
      shortDescription: "Search and update workspace pages.",
      setupLabel: "Bring your own MCP endpoint",
      docsUrl: "https://www.notion.so/product",
      tags: ["docs", "wiki"],
      recommended: true,
      requiresSetup: true,
      requiresAuth: true,
      authProvider: "notion",
      privacyLevel: "high",
      consentRequired: true,
      scopes: [],
    });
  });

  it("fills stable defaults when metadata is absent", () => {
    const item = mapSystemMcpMarketItem({
      systemServerId: "mcp-2",
      name: "GitHub",
      endpoint: "https://example.com/github/mcp",
      sourceType: null,
      metadata: null,
    });

    expect(item).toEqual({
      systemServerId: "mcp-2",
      name: "GitHub",
      endpoint: "https://example.com/github/mcp",
      sourceType: "external",
      slug: "github",
      icon: "github",
      category: "General",
      provider: "GitHub",
      shortDescription: "GitHub tools for your agent workflows.",
      setupLabel: "Quick add",
      docsUrl: null,
      tags: [],
      recommended: false,
      requiresSetup: false,
      requiresAuth: false,
      authProvider: null,
      privacyLevel: null,
      consentRequired: false,
      scopes: [],
    });
  });
});

describe("isDirectSystemMcpEndpoint", () => {
  it("accepts only http and https endpoints as directly connectable", () => {
    expect(isDirectSystemMcpEndpoint("https://example.com/mcp")).toBe(true);
    expect(isDirectSystemMcpEndpoint("http://example.com/mcp")).toBe(true);
    expect(isDirectSystemMcpEndpoint("setup://github")).toBe(false);
  });
});
