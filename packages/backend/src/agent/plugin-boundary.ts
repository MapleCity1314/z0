import type {
  AgentCapabilityBoundarySnapshot,
  AgentCoreCapabilityDescriptor,
  AgentPluginInventoryItem,
  AgentPluginManifest,
  AgentPluginMigrationNote,
  AgentToolOwnershipRecord,
  AgentToolMigrationStage,
} from "@z0/shared-types";
import { AGENT_TOOL_CATALOG, type AgentToolCatalogEntry } from "./tool-catalog";

const CORE_CAPABILITIES: AgentCoreCapabilityDescriptor[] = [
  {
    key: "conversation-engine",
    name: "Conversation engine",
    description:
      "Owns chat request handling, context shaping, and session-scoped orchestration.",
    surface: "conversation",
  },
  {
    key: "chat-ui",
    name: "Chat UI",
    description:
      "Owns the primary agent interaction surface and message transport contract.",
    surface: "chat-ui",
  },
  {
    key: "tool-runtime",
    name: "Tool runtime",
    description:
      "Owns tool registration, request routing, result handling, and approval-aware execution seams.",
    surface: "tool-runtime",
  },
  {
    key: "skill-runtime",
    name: "Skill runtime",
    description:
      "Owns skill discovery, activation, and prompt injection for reusable operating procedures.",
    surface: "skill-runtime",
  },
  {
    key: "mcp-runtime",
    name: "MCP runtime",
    description:
      "Owns MCP server connection lifecycle, tool qualification, and runtime exposure through core.",
    surface: "mcp-runtime",
  },
];

const PLUGIN_MANIFESTS: AgentPluginManifest[] = [
  {
    id: "@z0/plugin-project",
    name: "Project and Agentic Dev Sandbox",
    status: "planned",
    description:
      "Owns project CRUD, workspace files, build/runtime loops, browser automation, and project-local editing workflows.",
    highlights: [
      "Project lifecycle and workspace management",
      "Agentic dev loops from modify through runtime inspection",
      "Browser automation and design iteration workflows",
    ],
    tools: ["project:*"],
    skills: ["project-editing", "project-validation"],
    uiPanels: ["project-workspace", "design-workspace"],
    workflows: ["modify-run-inspect-iterate"],
  },
  {
    id: "@z0/plugin-search",
    name: "Super Search and Platform Intelligence",
    status: "planned",
    description:
      "Owns cross-platform retrieval, source comparison, and truthfulness-oriented research workflows.",
    highlights: [
      "Multi-source retrieval across external platforms",
      "Source comparison and contradiction analysis",
      "Truthfulness-aware research workflows",
    ],
    tools: ["search:*"],
    mcpServers: ["research-providers"],
    workflows: ["multi-source-research"],
  },
  {
    id: "@z0/plugin-subagents",
    name: "Subagent Customization",
    status: "planned",
    description:
      "Owns user-defined specialist roles, routing policy, and scoped execution context for delegated work.",
    highlights: [
      "User-defined specialist roles",
      "Delegation routing and scoped execution context",
      "Workflow-aware specialist bindings",
    ],
    subagentRoles: [
      "frontend-reviewer",
      "architecture-planner",
      "quant-analyst",
      "research-verifier",
    ],
    dependencies: ["@z0/plugin-project", "@z0/plugin-workflow"],
  },
  {
    id: "@z0/plugin-workflow",
    name: "Workflow Canvas",
    status: "planned",
    description:
      "Owns inspectable, retryable workflow orchestration with approval checkpoints.",
    highlights: [
      "Visual workflow orchestration",
      "Human approval checkpoints and retries",
      "Auditable scheduled and event-driven runs",
    ],
    workflows: ["workflow-canvas", "scheduled-runs"],
  },
  {
    id: "@z0/plugin-trading",
    name: "Crypto Quant and Semi-Automated Trading",
    status: "planned",
    description:
      "Owns trading workflows, backtesting, and approval-aware execution for crypto strategies.",
    highlights: [
      "Market regime and signal analysis",
      "Backtesting and risk-aware trading workflows",
      "Approval-aware execution with auditability",
    ],
    tools: ["trading:*"],
    skills: ["market-regime-analysis", "signal-validation"],
    dependencies: ["@z0/plugin-search", "@z0/plugin-workflow"],
  },
  {
    id: "@z0/plugin-resume",
    name: "Resume and Job Search",
    status: "planned",
    description:
      "Owns resume editing, job search, ranking, and application pipeline workflows.",
    highlights: [
      "Structured resume authoring and tailoring",
      "Job discovery, ranking, and matching",
      "Application pipeline workflows",
    ],
    tools: ["resume:*", "jobs:*"],
    skills: ["resume-authoring", "job-matching"],
    dependencies: ["@z0/plugin-search", "@z0/plugin-workflow"],
  },
  {
    id: "@z0/plugin-gittree",
    name: "GitTree Multi-Workflow Mode",
    status: "planned",
    description:
      "Owns concurrent workflow tracks, side-by-side comparisons, and isolated long-running branches.",
    highlights: [
      "Concurrent workflow tracks",
      "Side-by-side implementation and strategy comparison",
      "Isolated long-running branches",
    ],
    workflows: ["parallel-worktrees"],
    dependencies: ["@z0/plugin-project", "@z0/plugin-workflow"],
  },
];

const MIGRATION_NOTES: AgentPluginMigrationNote[] = [
  {
    pluginId: "@z0/plugin-project",
    summary:
      "Project-scoped tools can move behind a plugin manifest without changing the current chat transport.",
    implications: [
      "Current project tool groups stay executable through core until plugin mounting exists.",
      "Project diff tools already look like plugin-managed skill candidates instead of permanent core tools.",
      "Project runtime, DOM, and observability capabilities should remain routed through core approval and telemetry seams.",
    ],
  },
  {
    pluginId: "@z0/plugin-search",
    summary:
      "Research tools should migrate from always-defined core inventory to plugin-contributed search providers.",
    implications: [
      "Existing web-search gating can become plugin capability gating with the same request-level enablement shape.",
      "Tavily-style tools map cleanly to either plugin tools or plugin-provided MCP servers.",
      "The core should keep citation and uncertainty policies even after search capabilities move out.",
    ],
  },
  {
    pluginId: "@z0/plugin-subagents",
    summary:
      "Subagents do not need tool extraction first; they need a first-class routing and context contract.",
    implications: [
      "Current agent run context fields are the natural seam for future subagent parent/root run tracking.",
      "Subagent specialization should bind to skills, workflows, and plugin capability scopes rather than duplicate core orchestration.",
      "Telemetry and approval boundaries should stay core-owned even when specialist agents are plugin-defined.",
    ],
  },
];

function getMigrationStage(
  entry: AgentToolCatalogEntry,
): AgentToolMigrationStage {
  switch (entry.decision) {
    case "future-skill":
      return "plugin-skill-candidate";
    case "future-mcp":
      return "plugin-mcp-candidate";
    default:
      return "plugin-extraction-candidate";
  }
}

function getTargetOwnership(entry: AgentToolCatalogEntry): {
  targetOwner: AgentToolOwnershipRecord["targetOwner"];
  targetPluginId?: AgentToolOwnershipRecord["targetPluginId"];
  migrationStage: AgentToolOwnershipRecord["migrationStage"];
} {
  if (entry.group === "research") {
    return {
      targetOwner: "plugin",
      targetPluginId: "@z0/plugin-search",
      migrationStage: getMigrationStage(entry),
    };
  }

  if (entry.group.startsWith("project-")) {
    return {
      targetOwner: "plugin",
      targetPluginId: "@z0/plugin-project",
      migrationStage: getMigrationStage(entry),
    };
  }

  return {
    targetOwner: "core",
    migrationStage: "stable-core",
  };
}

function toPluginInventoryItem(
  manifest: AgentPluginManifest,
): AgentPluginInventoryItem {
  return {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    status: manifest.status,
    highlights: manifest.highlights,
    dependencies: manifest.dependencies ?? [],
    tools: manifest.tools ?? [],
    skills: manifest.skills ?? [],
    mcpServers: manifest.mcpServers ?? [],
    uiPanels: manifest.uiPanels ?? [],
    workflows: manifest.workflows ?? [],
    subagentRoles: manifest.subagentRoles ?? [],
  };
}

export function getAgentPluginInventory(): AgentPluginInventoryItem[] {
  return PLUGIN_MANIFESTS.map(toPluginInventoryItem);
}

export function getAgentCapabilityBoundarySnapshot(): AgentCapabilityBoundarySnapshot {
  return {
    contractVersion: "2026-03-core-plugin-boundary-v2",
    coreCapabilities: CORE_CAPABILITIES,
    pluginManifests: PLUGIN_MANIFESTS,
    pluginInventory: getAgentPluginInventory(),
    toolOwnership: AGENT_TOOL_CATALOG.map((entry) => ({
      toolName: entry.name,
      group: entry.group,
      currentOwner: "core",
      decision: entry.decision,
      requiresProject: Boolean(entry.requiresProject),
      requiresWebSearch: Boolean(entry.requiresWebSearch),
      ...getTargetOwnership(entry),
    })),
    migrationNotes: MIGRATION_NOTES,
  };
}
