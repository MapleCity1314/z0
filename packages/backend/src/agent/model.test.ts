import { describe, expect, it } from "vitest";
import { getTemperatureForResolvedModelId } from "./model";

describe("getTemperatureForResolvedModelId", () => {
  it("omits temperature for GPT-5 family models", () => {
    expect(getTemperatureForResolvedModelId("gpt-5", 0.7)).toBeUndefined();
    expect(getTemperatureForResolvedModelId("gpt-5.4", 0.7)).toBeUndefined();
    expect(getTemperatureForResolvedModelId("gpt-5-mini", 0.7)).toBeUndefined();
  });

  it("omits temperature for OpenAI reasoning-model families", () => {
    expect(getTemperatureForResolvedModelId("o1", 0.7)).toBeUndefined();
    expect(getTemperatureForResolvedModelId("o3-mini", 0.7)).toBeUndefined();
    expect(getTemperatureForResolvedModelId("o4-mini", 0.7)).toBeUndefined();
  });

  it("preserves fallback for models that allow custom temperatures", () => {
    expect(getTemperatureForResolvedModelId("kimi-k2.5", 0.7)).toBe(0.7);
  });
});
