import { describe, expect, it } from "vitest";
import {
  extractReasoningText,
  getCurrentReasoningStage,
  isReasoningStreaming,
  parseReasoningStages,
} from "./reasoning-stages";

describe("parseReasoningStages", () => {
  it("parses markdown h2 stages", () => {
    expect(
      parseReasoningStages(`
## Inspect problem
Read the user's request.

## Search references
Use web search if needed.
      `),
    ).toEqual([
      {
        title: "Inspect problem",
        body: "Read the user's request.",
      },
      {
        title: "Search references",
        body: "Use web search if needed.",
      },
    ]);
  });

  it("falls back to a single thinking stage without headings", () => {
    expect(parseReasoningStages("Freeform reasoning")).toEqual([
      {
        title: "Thinking",
        body: "Freeform reasoning",
      },
    ]);
  });

  it("keeps preface text before the first heading", () => {
    expect(
      parseReasoningStages(`
Quick scan first.

## Plan
Outline the fix.
      `),
    ).toEqual([
      {
        title: "Thinking",
        body: "Quick scan first.",
      },
      {
        title: "Plan",
        body: "Outline the fix.",
      },
    ]);
  });
});

describe("reasoning helpers", () => {
  it("extracts the latest reasoning stage from message parts", () => {
    const parts = [
      {
        type: "reasoning",
        state: "streaming",
        text: "## Plan\nOutline the fix.\n\n## Verify\nRun typecheck.",
      },
      {
        type: "text",
        text: "Done.",
      },
    ] as any;

    expect(extractReasoningText(parts)).toContain("## Plan");
    expect(isReasoningStreaming(parts)).toBe(true);
    expect(getCurrentReasoningStage(parts)).toEqual({
      title: "Verify",
      body: "Run typecheck.",
    });
  });
});
