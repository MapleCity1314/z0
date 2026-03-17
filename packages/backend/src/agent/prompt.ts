import {
  getEnabledAgentToolCatalog,
  type AgentToolCatalogEntry,
  type AgentToolGroup,
} from "./tool-catalog";
import { buildSkillsPrompt, type AgentSkillMetadata } from "./skills";

const TOOL_GROUP_LABELS: Record<AgentToolGroup, string> = {
  artifacts: "Artifacts",
  packages: "File packages",
  research: "Web research",
  "project-core": "Project management",
  "project-files": "Project files",
  "project-build": "Project build",
  "project-runtime": "Project runtime",
  "project-dom": "Browser automation",
  "project-observability": "Browser observability",
  "project-diff": "Project patching",
  system: "System operations",
};

function renderToolSection(entries: AgentToolCatalogEntry[]) {
  const grouped = new Map<AgentToolGroup, AgentToolCatalogEntry[]>();

  for (const entry of entries) {
    const bucket = grouped.get(entry.group) ?? [];
    bucket.push(entry);
    grouped.set(entry.group, bucket);
  }

  return [...grouped.entries()]
    .map(([group, groupEntries]) => {
      const tools = groupEntries
        .map((entry) => `- ${entry.name}: ${entry.description}`)
        .join("\n");

      return `<tool_group name="${TOOL_GROUP_LABELS[group]}">\n${tools}\n</tool_group>`;
    })
    .join("\n");
}

function renderToolSelectionPolicy(entries: AgentToolCatalogEntry[]) {
  const hasProjectDiff = entries.some((entry) => entry.group === "project-diff");
  const hasProjectDom = entries.some((entry) => entry.group === "project-dom");
  const hasResearch = entries.some((entry) => entry.group === "research");

  const guidance = [
    "- Prefer the lightest tool that can answer the question or perform the edit.",
    "- Prefer targeted reads over broad scans. Read specific files before escalating to runtime inspection.",
    "- Avoid stateful or expensive tools unless they add evidence you cannot get from cheaper tools.",
  ];

  if (hasProjectDiff) {
    guidance.push(
      "- For localized code edits, prefer searchReplace first, then patchProjectFile or generateDiff/applyDiff, and use generateASTPatch only when syntax-aware edits are necessary.",
    );
  }

  if (hasProjectDom) {
    guidance.push(
      "- Use DOM or screenshot tools only when static file inspection is insufficient or when verifying runtime/UI behavior.",
    );
  }

  if (hasResearch) {
    guidance.push(
      "- For web research, prefer tavilySearch or tavilyExtract. Use tavilyMap or tavilyCrawl only for site-wide exploration.",
    );
  }

  return `<tool_selection_policy>\n${guidance.join("\n")}\n</tool_selection_policy>`;
}

export function buildChatSystemPrompt(params: {
  webSearchEnabled: boolean;
  projectId: string | null;
  memoryContext?: string;
  skills?: AgentSkillMetadata[];
}) {
  const enabledTools = getEnabledAgentToolCatalog({
    webSearchEnabled: params.webSearchEnabled,
    projectId: params.projectId,
  });

  const memoryBlock = params.memoryContext?.trim()
    ? `\n<memory_context>\n${params.memoryContext.trim()}\n</memory_context>`
    : "";

  return `<role>
You are z0 Agent. You are a direct, high-agency product and coding assistant.
</role>

<operating_rules>
1. Respond directly and avoid filler or self-congratulatory narration.
2. Default to taking useful action with available tools instead of only suggesting ideas.
3. Use tools only when they materially improve correctness or let you complete the task.
4. If multiple independent tool calls are useful, prefer parallel execution.
5. Do not claim access to capabilities that are not exposed as tools in this request.
6. Skills and MCP connections may exist in product configuration, but they are not available unless surfaced as runtime tools.
7. Ask before destructive, hard-to-reverse, or externally visible actions.
</operating_rules>

<reasoning_policy>
- Choose an approach and commit to it.
- Avoid over-exploring unless new information invalidates the current approach.
- Use structured reasoning after tool results, then take the best next action.
</reasoning_policy>

<response_policy>
- Prefer concise, grounded answers.
- Use citations when facts come from web research or external sources.
- For project work, prefer editing or inspecting the current project over describing hypothetical changes.
</response_policy>

${renderToolSelectionPolicy(enabledTools)}

<tooling>
${renderToolSection(enabledTools)}
</tooling>${buildSkillsPrompt(params.skills ?? [])}${memoryBlock}`;
}
