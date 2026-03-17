import { existsSync, promises as fs } from "node:fs";
import { resolve } from "node:path";
import { tool, type ToolSet } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { chatSkill, getDb, skill, userSkill } from "@z0/db";

export type AgentSkillMetadata = {
  name: string;
  description: string;
  path: string;
  source: "workspace" | "configured";
};

type SkillFrontmatter = {
  name: string;
  description: string;
};

function getWorkspaceRoot() {
  return resolve(process.cwd(), "../..");
}

function parseFrontmatterValue(raw: string) {
  const value = raw.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function parseSkillFrontmatter(content: string): SkillFrontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/u);

  if (!match?.[1]) {
    throw new Error("No frontmatter found");
  }

  const entries = Object.fromEntries(
    match[1]
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(":");

        if (separatorIndex === -1) {
          throw new Error(`Invalid frontmatter line: ${line}`);
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = parseFrontmatterValue(line.slice(separatorIndex + 1));
        return [key, value];
      }),
  );

  if (!entries.name || !entries.description) {
    throw new Error("Skill frontmatter requires name and description");
  }

  return {
    name: entries.name,
    description: entries.description,
  };
}

export function stripSkillFrontmatter(content: string) {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/u);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

async function readSkillMetadata(
  skillDir: string,
  source: AgentSkillMetadata["source"],
) {
  const skillFile = resolve(skillDir, "SKILL.md");
  const content = await fs.readFile(skillFile, "utf8");
  const frontmatter = parseSkillFrontmatter(content);

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    path: skillDir,
    source,
  } satisfies AgentSkillMetadata;
}

async function discoverSkillsInDirectory(directory: string) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const skills: AgentSkillMetadata[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillDir = resolve(directory, entry.name);
    const skillFile = resolve(skillDir, "SKILL.md");

    if (!existsSync(skillFile)) {
      continue;
    }

    skills.push(await readSkillMetadata(skillDir, "workspace"));
  }

  return skills;
}

function resolveConfiguredSkillDirectory(directory: string) {
  return directory.startsWith("/") ? directory : resolve(getWorkspaceRoot(), directory);
}

export async function getConfiguredSkillDirectories(params: {
  userId: string;
  chatId: string;
}) {
  const db = getDb();
  const rows = await db
    .select({ directory: skill.directory })
    .from(chatSkill)
    .innerJoin(userSkill, eq(chatSkill.userSkillId, userSkill.id))
    .innerJoin(skill, eq(userSkill.skillId, skill.id))
    .where(
      and(
        eq(chatSkill.chatId, params.chatId),
        eq(chatSkill.enabled, true),
        eq(userSkill.userId, params.userId),
        eq(skill.isActive, true),
      ),
    )
    .orderBy(desc(userSkill.updatedAt));

  return rows.map((row) => row.directory);
}

export async function discoverAgentSkills(params?: {
  workspaceSkillDirectories?: string[];
  configuredSkillDirectories?: string[];
}) {
  const skillMetadata: AgentSkillMetadata[] = [];
  const seenNames = new Set<string>();
  const workspaceSkillDirectories =
    params?.workspaceSkillDirectories ?? [resolve(getWorkspaceRoot(), ".agents/skills")];

  for (const directory of workspaceSkillDirectories) {
    try {
      const discovered = await discoverSkillsInDirectory(directory);

      for (const skill of discovered) {
        if (seenNames.has(skill.name)) {
          continue;
        }

        seenNames.add(skill.name);
        skillMetadata.push(skill);
      }
    } catch {
      continue;
    }
  }

  for (const directory of params?.configuredSkillDirectories ?? []) {
    try {
      const resolvedDirectory = resolveConfiguredSkillDirectory(directory);
      const skill = await readSkillMetadata(resolvedDirectory, "configured");

      if (seenNames.has(skill.name)) {
        continue;
      }

      seenNames.add(skill.name);
      skillMetadata.push(skill);
    } catch {
      continue;
    }
  }

  return skillMetadata;
}

export function buildSkillsPrompt(skills: AgentSkillMetadata[]) {
  if (skills.length === 0) {
    return "";
  }

  const list = skills
    .map((skill) => `- ${skill.name}: ${skill.description}`)
    .join("\n");

  return `\n<skills>\nUse the loadSkill tool when the user's request matches one of these specialized workflows.\nAvailable skills:\n${list}\n</skills>`;
}

export function createSkillTools(skills: AgentSkillMetadata[]): ToolSet {
  if (skills.length === 0) {
    return {};
  }

  return {
    loadSkill: tool({
      description: "Load a skill to get specialized task instructions.",
      inputSchema: z.object({
        name: z.string().describe("The skill name to load"),
      }),
      execute: async ({ name }) => {
        const skill = skills.find(
          (entry) => entry.name.toLowerCase() === name.trim().toLowerCase(),
        );

        if (!skill) {
          return { error: `Skill '${name}' not found` };
        }

        const content = await fs.readFile(resolve(skill.path, "SKILL.md"), "utf8");

        return {
          name: skill.name,
          skillDirectory: skill.path,
          content: stripSkillFrontmatter(content),
        };
      },
    }),
  } satisfies ToolSet;
}
