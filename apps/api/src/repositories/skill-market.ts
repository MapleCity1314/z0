import type { SystemSkillMarketItemDto } from "@z0/shared-types";

const BUILTIN_SYSTEM_SKILLS: readonly SystemSkillMarketItemDto[] = [
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
];

function normalizeKey(item: Pick<SystemSkillMarketItemDto, "name" | "directory">) {
  return `${item.name.trim().toLowerCase()}::${item.directory.trim().toLowerCase()}`;
}

export function getBuiltinSystemSkills(): SystemSkillMarketItemDto[] {
  return BUILTIN_SYSTEM_SKILLS.map((item) => ({ ...item }));
}

export function mergeSystemSkillMarketItems(
  databaseItems: SystemSkillMarketItemDto[],
): SystemSkillMarketItemDto[] {
  const merged = [...getBuiltinSystemSkills()];
  const seen = new Set(merged.map((item) => normalizeKey(item)));

  for (const item of databaseItems) {
    const key = normalizeKey(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(item);
  }

  return merged;
}
