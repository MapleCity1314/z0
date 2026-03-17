import { describe, expect, it } from "vitest";
import {
  AGENT_TOOL_CATALOG,
  getEnabledAgentToolCatalog,
  summarizeAgentToolCatalog,
} from "./tool-catalog";

describe("agent tool catalog", () => {
  it("captures the current tool inventory", () => {
    expect(AGENT_TOOL_CATALOG).toHaveLength(61);
    expect(summarizeAgentToolCatalog()).toMatchObject({
      total: 61,
      keepInternal: 33,
      refactorInternal: 6,
      futureSkill: 4,
      futureMcp: 18,
      fast: 14,
      moderate: 18,
      expensive: 12,
      stateful: 17,
      requiresProject: 40,
      requiresWebSearch: 4,
    });
  });

  it("filters enabled tools by request context", () => {
    expect(
      getEnabledAgentToolCatalog({
        webSearchEnabled: false,
        projectId: null,
      }),
    ).toHaveLength(17);

    expect(
      getEnabledAgentToolCatalog({
        webSearchEnabled: true,
        projectId: null,
      }),
    ).toHaveLength(21);

    expect(
      getEnabledAgentToolCatalog({
        webSearchEnabled: true,
        projectId: "project-1",
      }),
    ).toHaveLength(61);
  });
});
