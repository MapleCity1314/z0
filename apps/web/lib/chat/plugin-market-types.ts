import type {
  AgentPluginRuntimeStatus,
  AgentPluginStatus,
} from "@z0/shared-types";

export type ConversationMcpServer = {
  userMcpServerId: string;
  systemServerId: string;
  name: string;
  endpoint: string;
  sourceType: string;
  useInCurrentChat: boolean;
  useByDefault: boolean;
  connectorSlug: string | null;
  requiresAuth: boolean;
  authProvider: string | null;
  authStatus: "not-required" | "not-connected" | "connected" | "expired";
  privacyLevel: "low" | "high" | null;
  connectedAt: string | null;
  consentGrantedAt: string | null;
};

export type ConversationSkill = {
  userSkillId: string;
  systemSkillId: string;
  name: string;
  directory: string;
  sourceType: string;
  useInCurrentChat: boolean;
  useByDefault: boolean;
};

export type SystemMcpMarketItem = {
  systemServerId: string;
  name: string;
  endpoint: string;
  sourceType: string;
  slug: string;
  icon: string;
  category: string;
  provider: string;
  shortDescription: string;
  setupLabel: string;
  docsUrl: string | null;
  tags: string[];
  recommended: boolean;
  requiresSetup: boolean;
  requiresAuth: boolean;
  authProvider: string | null;
  privacyLevel: "low" | "high" | null;
  consentRequired: boolean;
  scopes: string[];
};

export type SystemSkillMarketItem = {
  systemSkillId: string;
  name: string;
  directory: string;
  sourceType: string;
};

export type SystemPluginMarketItem = {
  pluginId: string;
  name: string;
  status: AgentPluginStatus;
  runtimeStatus: AgentPluginRuntimeStatus;
  description: string;
  highlights: string[];
  tools: string[];
  skills: string[];
  mcpServers: string[];
  uiPanels: string[];
  workflows: string[];
  subagentRoles: string[];
  dependencies: string[];
};
