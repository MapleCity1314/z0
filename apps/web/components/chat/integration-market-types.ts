export type ConversationMcpServer = {
  userMcpServerId: string;
  systemServerId: string;
  name: string;
  endpoint: string;
  sourceType: string;
  useInCurrentChat: boolean;
  useByDefault: boolean;
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
};

export type SystemSkillMarketItem = {
  systemSkillId: string;
  name: string;
  directory: string;
  sourceType: string;
};
