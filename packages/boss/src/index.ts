export const bossPackageName = "@z0/boss";
export const bossMcpEndpoint = `npm:${bossPackageName}`;
export const bossSkillDirectory = "packages/boss";

export type BossMcpMetadata = {
  name: string;
  endpoint: string;
  sourceType: string;
  skillDirectory: string;
};

export function getBossSkillDirectory() {
  return bossSkillDirectory;
}

export function getBossMcpMetadata(): BossMcpMetadata {
  return {
    name: "Boss",
    endpoint: bossMcpEndpoint,
    sourceType: "npm-package",
    skillDirectory: getBossSkillDirectory(),
  };
}
