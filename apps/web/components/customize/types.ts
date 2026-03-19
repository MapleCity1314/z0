"use client";

export type CustomizeSection = "skills" | "connectors" | "plugins" | "subagents";

export type UserMcpItem = {
  userMcpServerId: string;
  systemServerId: string;
  systemServerName: string;
  endpoint: string;
  sourceType: string;
  useByDefault: boolean;
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
