import { describe, expect, it } from "vitest";
import {
  calculateCostUSD,
  calculateCreditsFromTokens,
  calculateTokensFromText,
  calculateUsageFromUIMessages,
} from "./usage";

describe("agent usage helpers", () => {
  it("estimates tokens from plain text and code", () => {
    expect(calculateTokensFromText("hello world")).toBeGreaterThan(0);
    expect(
      calculateTokensFromText("function x() { return 1; }"),
    ).toBeGreaterThan(0);
  });

  it("calculates usage from ui messages", () => {
    const usage = calculateUsageFromUIMessages([
      { id: "u1", role: "user", parts: [{ type: "text", text: "hello" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "world" }] },
    ] as any);

    expect(usage.promptTokens).toBeGreaterThan(0);
    expect(usage.completionTokens).toBeGreaterThan(0);
    expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens);
  });

  it("calculates credits and usd cost", () => {
    expect(calculateCreditsFromTokens(1000, 500)).toBeGreaterThan(0);
    expect(
      calculateCostUSD({
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      }).totalUSD,
    ).toBeGreaterThan(0);
  });
});
