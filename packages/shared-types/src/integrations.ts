import type {
  AgentPluginId,
  AgentPluginRuntimeStatus,
  AgentPluginStatus,
} from "./agent";

export interface IntegrationMcpServerDto {
  userMcpServerId: string;
  systemServerId: string;
  systemServerName: string;
  endpoint: string;
  sourceType: string;
  useByDefault: boolean;
  enabledInChat: boolean;
  connectorSlug: string | null;
  requiresAuth: boolean;
  authProvider: string | null;
  authStatus: "not-required" | "not-connected" | "connected" | "expired";
  privacyLevel: "low" | "high" | null;
  connectedAt: string | null;
  consentGrantedAt: string | null;
}

export interface IntegrationSkillDto {
  userSkillId: string;
  systemSkillId: string;
  systemSkillName: string;
  directory: string;
  sourceType: string;
  useByDefault: boolean;
  enabledInChat: boolean;
}

export interface SystemMcpMarketItemDto {
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
}

export interface SystemSkillMarketItemDto {
  systemSkillId: string;
  name: string;
  directory: string;
  sourceType: string;
}

export interface SystemPluginMarketItemDto {
  pluginId: AgentPluginId;
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
  dependencies: AgentPluginId[];
}

export interface ChatIntegrationsDto {
  mcpServers: IntegrationMcpServerDto[];
  skills: IntegrationSkillDto[];
}

export interface UserIntegrationSettingsDto {
  mcpServers: IntegrationMcpServerDto[];
  skills: IntegrationSkillDto[];
}

export interface SystemIntegrationMarketDto {
  mcpServers: SystemMcpMarketItemDto[];
  skills: SystemSkillMarketItemDto[];
  plugins: SystemPluginMarketItemDto[];
}

export interface AddMcpServerRequest {
  name: string;
  endpoint: string;
  sourceType?: string;
}

export interface AddSkillRequest {
  name: string;
  directory: string;
}

export interface UpdateChatMcpServerStateRequest {
  enabledInChat: boolean;
  useByDefault: boolean;
}

export interface UpdateChatSkillStateRequest {
  enabledInChat: boolean;
  useByDefault: boolean;
}

export interface UpdateUserMcpDefaultRequest {
  useByDefault: boolean;
}

export interface UpdateUserSkillDefaultRequest {
  useByDefault: boolean;
}
