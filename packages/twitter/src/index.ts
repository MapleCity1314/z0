export const twitterPackageName = "@z0/twitter";
export const twitterMcpEndpoint = `npm:${twitterPackageName}`;
export const twitterSkillDirectory = "packages/twitter";

export type TwitterMcpMetadata = {
  name: string;
  endpoint: string;
  sourceType: string;
  skillDirectory: string;
};

export function getTwitterSkillDirectory() {
  return twitterSkillDirectory;
}

export function getTwitterMcpMetadata(): TwitterMcpMetadata {
  return {
    name: "Twitter",
    endpoint: twitterMcpEndpoint,
    sourceType: "npm-package",
    skillDirectory: getTwitterSkillDirectory(),
  };
}
