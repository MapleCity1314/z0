import {
  getEnabledAgentToolCatalog,
  type AgentToolCatalogEntry,
  type AgentToolGroup,
} from "./tool-catalog";

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

export function buildChatSystemPrompt(params: {
  webSearchEnabled: boolean;
  projectId: string | null;
  memoryContext?: string;
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

<tooling>
${renderToolSection(enabledTools)}
</tooling>${memoryBlock}`;
}
