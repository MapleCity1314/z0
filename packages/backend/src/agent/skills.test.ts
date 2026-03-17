import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSkillsPrompt,
  createSkillTools,
  discoverAgentSkills,
  parseSkillFrontmatter,
  stripSkillFrontmatter,
} from "./skills";

const tempDirs: string[] = [];

function createTempRoot() {
  const root = mkdtempSync(join(tmpdir(), "z0-agent-skills-"));
  tempDirs.push(root);
  return root;
}

function writeSkill(root: string, name: string, description: string) {
  const skillDir = join(root, name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\nUse this skill.\n`,
  );
  return skillDir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe("agent skills", () => {
  it("parses and strips skill frontmatter", () => {
    const content = [
      "---",
      "name: refactor-diff",
      "description: Apply structured refactors",
      "---",
      "",
      "# Refactor Diff",
    ].join("\n");

    expect(parseSkillFrontmatter(content)).toEqual({
      name: "refactor-diff",
      description: "Apply structured refactors",
    });
    expect(stripSkillFrontmatter(content)).toBe("# Refactor Diff");
  });

  it("discovers workspace and configured skills", async () => {
    const workspaceRoot = createTempRoot();
    const configuredRoot = createTempRoot();

    writeSkill(workspaceRoot, "workspace-skill", "From workspace");
    const configuredDir = writeSkill(
      configuredRoot,
      "configured-skill",
      "From config",
    );

    const skills = await discoverAgentSkills({
      workspaceSkillDirectories: [workspaceRoot],
      configuredSkillDirectories: [configuredDir],
    });

    expect(skills.map((skill) => skill.name)).toEqual([
      "workspace-skill",
      "configured-skill",
    ]);
  });

  it("loads a skill through the runtime tool", async () => {
    const workspaceRoot = createTempRoot();
    writeSkill(workspaceRoot, "patch-skill", "Patch files carefully");

    const [skill] = await discoverAgentSkills({
      workspaceSkillDirectories: [workspaceRoot],
    });

    const tools = createSkillTools([skill]);
    const loadSkillTool = tools.loadSkill;

    if (!loadSkillTool?.execute) {
      throw new Error("loadSkill tool was not created");
    }

    const result = (await loadSkillTool.execute(
      { name: "patch-skill" },
      {} as never,
    )) as {
      name: string;
      skillDirectory: string;
      content: string;
    };

    expect(result).toMatchObject({
      name: "patch-skill",
      skillDirectory: expect.stringContaining("patch-skill"),
    });
    expect(result.content).toContain("# patch-skill");
    expect(buildSkillsPrompt([skill])).toContain("patch-skill");
  });
});
