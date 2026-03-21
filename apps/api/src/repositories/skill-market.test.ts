import { describe, expect, it } from "vitest";
import {
  getBuiltinSystemSkills,
  mergeSystemSkillMarketItems,
} from "./skill-market";

describe("skill market catalog", () => {
  it("exposes the built-in z0 social skills as system skills", () => {
    expect(getBuiltinSystemSkills()).toEqual([
      {
        systemSkillId: "system-skill-z0-boss",
        name: "@z0/boss",
        directory: "packages/boss",
        sourceType: "system",
      },
      {
        systemSkillId: "system-skill-z0-twitter",
        name: "@z0/twitter",
        directory: "packages/twitter",
        sourceType: "system",
      },
      {
        systemSkillId: "system-skill-z0-bilibili",
        name: "@z0/bilibili",
        directory: "packages/bilibili",
        sourceType: "system",
      },
      {
        systemSkillId: "system-skill-z0-xiaohongshu",
        name: "@z0/xiaohongshu",
        directory: "packages/xiaohongshu",
        sourceType: "system",
      },
    ]);
  });

  it("keeps built-ins first and deduplicates database entries by name and directory", () => {
    const merged = mergeSystemSkillMarketItems([
      {
        systemSkillId: "db-1",
        name: "@z0/twitter",
        directory: "packages/twitter",
        sourceType: "external",
      },
      {
        systemSkillId: "db-2",
        name: "Custom Research",
        directory: ".agents/skills/custom-research",
        sourceType: "external",
      },
    ]);

    expect(merged.slice(0, 4).map((item) => item.name)).toEqual([
      "@z0/boss",
      "@z0/twitter",
      "@z0/bilibili",
      "@z0/xiaohongshu",
    ]);
    expect(merged).toContainEqual({
      systemSkillId: "db-2",
      name: "Custom Research",
      directory: ".agents/skills/custom-research",
      sourceType: "external",
    });
    expect(
      merged.filter(
        (item) => item.name === "@z0/twitter" && item.directory === "packages/twitter",
      ),
    ).toHaveLength(1);
  });
});
