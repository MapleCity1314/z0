export const xiaohongshuPackageName = "@z0/xiaohongshu";
export const xiaohongshuMcpEndpoint = `npm:${xiaohongshuPackageName}`;
export const xiaohongshuSkillDirectory = "packages/xiaohongshu";

export type XiaohongshuMcpMetadata = {
  name: string;
  endpoint: string;
  sourceType: string;
  skillDirectory: string;
};

export function getXiaohongshuSkillDirectory() {
  return xiaohongshuSkillDirectory;
}

export function getXiaohongshuMcpMetadata(): XiaohongshuMcpMetadata {
  return {
    name: "Xiaohongshu",
    endpoint: xiaohongshuMcpEndpoint,
    sourceType: "npm-package",
    skillDirectory: getXiaohongshuSkillDirectory(),
  };
}
