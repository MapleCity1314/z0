import { describe, expect, it } from "vitest";
import { buildChatSystemPrompt } from "./prompt";

describe("buildChatSystemPrompt", () => {
  it("renders only the enabled tool groups for a plain chat", () => {
    const prompt = buildChatSystemPrompt({
      webSearchEnabled: false,
      projectId: null,
    });

    expect(prompt).toContain("<tool_group name=\"Artifacts\">");
    expect(prompt).toContain("<tool_group name=\"System operations\">");
    expect(prompt).toContain("<tool_selection_policy>");
    expect(prompt).not.toContain("Web research");
    expect(prompt).not.toContain("Project files");
  });

  it("includes web and project tools plus memory context when available", () => {
    const prompt = buildChatSystemPrompt({
      webSearchEnabled: true,
      projectId: "project-1",
      memoryContext: "[User Memory Context]\nPrefers TypeScript",
      skills: [
        {
          name: "refactor-diff",
          description: "Apply structured code refactors",
          path: "/tmp/refactor-diff",
          source: "configured",
        },
      ],
    });

    expect(prompt).toContain("<tool_group name=\"Web research\">");
    expect(prompt).toContain("<tool_group name=\"Project files\">");
    expect(prompt).toContain("prefer searchReplace first");
    expect(prompt).toContain("Use DOM or screenshot tools only");
    expect(prompt).toContain("<skills>");
    expect(prompt).toContain("refactor-diff");
    expect(prompt).toContain("<memory_context>");
    expect(prompt).toContain("Prefers TypeScript");
  });
});
