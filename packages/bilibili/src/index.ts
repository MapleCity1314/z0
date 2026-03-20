export const bilibiliPackageName = "@z0/bilibili";
export const bilibiliMcpEndpoint = `npm:${bilibiliPackageName}`;
export const bilibiliSkillDirectory = "packages/bilibili";

export type BilibiliMcpMetadata = {
  name: string;
  endpoint: string;
  sourceType: string;
  skillDirectory: string;
};

export function getBilibiliSkillDirectory() {
  return bilibiliSkillDirectory;
}

export function getBilibiliMcpMetadata(): BilibiliMcpMetadata {
  return {
    name: "Bilibili",
    endpoint: bilibiliMcpEndpoint,
    sourceType: "npm-package",
    skillDirectory: getBilibiliSkillDirectory(),
  };
}
