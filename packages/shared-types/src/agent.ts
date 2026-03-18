export const plannedAgentPluginIds = [
  "@z0/plugin-trading",
  "@z0/plugin-project",
  "@z0/plugin-search",
  "@z0/plugin-resume",
  "@z0/plugin-workflow",
  "@z0/plugin-subagents",
  "@z0/plugin-gittree",
] as const;

export type AgentPluginId = (typeof plannedAgentPluginIds)[number];

export type AgentCapabilityOwner = "core" | "plugin";

export type AgentCapabilitySurface =
  | "conversation"
  | "chat-ui"
  | "tool-runtime"
  | "skill-runtime"
  | "mcp-runtime"
  | "tool"
  | "skill"
  | "mcp-server"
  | "ui-panel"
  | "workflow"
  | "subagent-role";

export type AgentPluginStatus = "planned" | "active";

export type AgentToolMigrationStage =
  | "stable-core"
  | "plugin-extraction-candidate"
  | "plugin-skill-candidate"
  | "plugin-mcp-candidate";

export interface AgentCoreCapabilityDescriptor {
  key: string;
  name: string;
  description: string;
  surface: Extract<
    AgentCapabilitySurface,
    "conversation" | "chat-ui" | "tool-runtime" | "skill-runtime" | "mcp-runtime"
  >;
}

export interface AgentPluginManifest {
  id: AgentPluginId;
  name: string;
  status: AgentPluginStatus;
  description: string;
  tools?: string[];
  skills?: string[];
  mcpServers?: string[];
  uiPanels?: string[];
  workflows?: string[];
  subagentRoles?: string[];
  dependencies?: AgentPluginId[];
}

export interface AgentToolOwnershipRecord {
  toolName: string;
  group: string;
  currentOwner: "core";
  targetOwner: AgentCapabilityOwner;
  targetPluginId?: AgentPluginId;
  migrationStage: AgentToolMigrationStage;
  decision: string;
  requiresProject: boolean;
  requiresWebSearch: boolean;
}

export interface AgentPluginMigrationNote {
  pluginId: AgentPluginId;
  summary: string;
  implications: string[];
}

export interface AgentCapabilityBoundarySnapshot {
  contractVersion: "2026-03-core-plugin-boundary-v1";
  coreCapabilities: AgentCoreCapabilityDescriptor[];
  pluginManifests: AgentPluginManifest[];
  toolOwnership: AgentToolOwnershipRecord[];
  migrationNotes: AgentPluginMigrationNote[];
}
