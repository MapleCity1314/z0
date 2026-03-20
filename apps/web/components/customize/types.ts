"use client";

export type CustomizeSection = "skills" | "connectors" | "plugins" | "subagents";

export type UserMcpItem = {
  userMcpServerId: string;
  systemServerId: string;
  systemServerName: string;
  endpoint: string;
  sourceType: string;
  useByDefault: boolean;
  connectorSlug: string | null;
  requiresAuth: boolean;
  authProvider: string | null;
  authStatus: "not-required" | "not-connected" | "connected" | "expired";
  privacyLevel: "low" | "high" | null;
  connectedAt: string | null;
  consentGrantedAt: string | null;
};

export type UserSkillItem = {
  userSkillId: string;
  systemSkillId: string;
  systemSkillName: string;
  directory: string;
  sourceType: string;
  useByDefault: boolean;
};

export type SkillFormState = {
  name: string;
  dir: string;
};

export type ConnectorFormState = {
  name: string;
  endpoint: string;
};

export type SubagentRoleItem = {
  role: string;
  pluginId: string;
  pluginName: string;
  status: string;
};
