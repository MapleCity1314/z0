"use server";

import {
  getAgentCapabilityBoundarySnapshot,
  warmPooledMcpServers,
  type AgentMcpServerMetadata,
} from "@z0/backend";
import { AUTHENTICATION_REQUIRED_MESSAGE } from "@/lib/api-errors";
import { getActionErrorMessage } from "@/lib/auth-errors";
import { getCurrentUser } from "@/lib/session";
import { toSystemPluginMarketItems } from "@/components/chat/plugin-market";
import {
  addMcpServerForChat,
  addMcpServerForUser,
  addSkillForChat,
  addSkillForUser,
  getChatMcpServers,
  getChatSkills,
  getSystemMcpServers,
  getSystemSkills,
  getUserMcpServers,
  getUserSkills,
  setChatMcpEnabled,
  setChatSkillEnabled,
  setUserMcpDefault,
  setUserSkillDefault,
} from "@/lib/db/integrations";

type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

async function requireUser() {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error(AUTHENTICATION_REQUIRED_MESSAGE);
  }
  return user;
}

function toActionError(error: unknown, fallback: string) {
  return {
    success: false,
    message: getActionErrorMessage(error, fallback),
  } as const;
}

export async function getChatIntegrationsAction(chatId: string): Promise<
  ActionResult<{
    mcpServers: Awaited<ReturnType<typeof getChatMcpServers>>;
    skills: Awaited<ReturnType<typeof getChatSkills>>;
  }>
> {
  try {
    const user = await requireUser();
    const [mcpServers, skills] = await Promise.all([
      getChatMcpServers(user.id, chatId),
      getChatSkills(user.id, chatId),
    ]);

    return {
      success: true,
      message: "Chat integrations loaded",
      data: { mcpServers, skills },
    };
  } catch (error) {
    return toActionError(error, "Failed to load chat integrations");
  }
}

export async function addChatMcpServerAction(params: {
  chatId: string;
  name: string;
  endpoint: string;
}) {
  try {
    const user = await requireUser();
    await addMcpServerForChat({
      userId: user.id,
      chatId: params.chatId,
      name: params.name,
      endpoint: params.endpoint,
    });
    return { success: true, message: "MCP server linked to chat" } as const;
  } catch (error) {
    return toActionError(error, "Failed to add MCP server");
  }
}

export async function setChatMcpServerStateAction(params: {
  chatId: string;
  userMcpServerId: string;
  enabledInChat: boolean;
  useByDefault: boolean;
}) {
  try {
    const user = await requireUser();
    await Promise.all([
      setChatMcpEnabled({
        userId: user.id,
        chatId: params.chatId,
        userMcpServerId: params.userMcpServerId,
        enabled: params.enabledInChat,
      }),
      setUserMcpDefault({
        userId: user.id,
        userMcpServerId: params.userMcpServerId,
        useByDefault: params.useByDefault,
      }),
    ]);
    return { success: true, message: "MCP settings updated" } as const;
  } catch (error) {
    return toActionError(error, "Failed to update MCP settings");
  }
}

export async function addChatSkillAction(params: {
  chatId: string;
  name: string;
  directory: string;
}) {
  try {
    const user = await requireUser();
    await addSkillForChat({
      userId: user.id,
      chatId: params.chatId,
      name: params.name,
      directory: params.directory,
    });
    return { success: true, message: "Skill linked to chat" } as const;
  } catch (error) {
    return toActionError(error, "Failed to add skill");
  }
}

export async function setChatSkillStateAction(params: {
  chatId: string;
  userSkillId: string;
  enabledInChat: boolean;
  useByDefault: boolean;
}) {
  try {
    const user = await requireUser();
    await Promise.all([
      setChatSkillEnabled({
        userId: user.id,
        chatId: params.chatId,
        userSkillId: params.userSkillId,
        enabled: params.enabledInChat,
      }),
      setUserSkillDefault({
        userId: user.id,
        userSkillId: params.userSkillId,
        useByDefault: params.useByDefault,
      }),
    ]);
    return { success: true, message: "Skill settings updated" } as const;
  } catch (error) {
    return toActionError(error, "Failed to update skill settings");
  }
}

export async function getUserIntegrationSettingsAction(): Promise<
  ActionResult<{
    mcpServers: Awaited<ReturnType<typeof getUserMcpServers>>;
    skills: Awaited<ReturnType<typeof getUserSkills>>;
  }>
> {
  try {
    const user = await requireUser();
    const [mcpServers, skills] = await Promise.all([
      getUserMcpServers(user.id),
      getUserSkills(user.id),
    ]);
    return {
      success: true,
      message: "User integration settings loaded",
      data: { mcpServers, skills },
    };
  } catch (error) {
    return toActionError(error, "Failed to load user integration settings");
  }
}

export async function getSystemIntegrationMarketAction(): Promise<
  ActionResult<{
    mcpServers: Awaited<ReturnType<typeof getSystemMcpServers>>;
    skills: Awaited<ReturnType<typeof getSystemSkills>>;
    plugins: ReturnType<typeof toSystemPluginMarketItems>;
  }>
> {
  try {
    await requireUser();
    const capabilitySnapshot = getAgentCapabilityBoundarySnapshot();
    const [mcpServers, skills] = await Promise.all([
      getSystemMcpServers(),
      getSystemSkills(),
    ]);
    return {
      success: true,
      message: "System integration market loaded",
      data: {
        mcpServers,
        skills,
        plugins: toSystemPluginMarketItems(capabilitySnapshot),
      },
    };
  } catch (error) {
    return toActionError(error, "Failed to load system integration market");
  }
}

export async function addUserMcpServerAction(params: {
  name: string;
  endpoint: string;
}) {
  try {
    const user = await requireUser();
    await addMcpServerForUser({
      userId: user.id,
      name: params.name,
      endpoint: params.endpoint,
    });
    return { success: true, message: "MCP server added" } as const;
  } catch (error) {
    return toActionError(error, "Failed to add MCP server");
  }
}

export async function addUserSkillAction(params: {
  name: string;
  directory: string;
}) {
  try {
    const user = await requireUser();
    await addSkillForUser({
      userId: user.id,
      name: params.name,
      directory: params.directory,
    });
    return { success: true, message: "Skill added" } as const;
  } catch (error) {
    return toActionError(error, "Failed to add skill");
  }
}

export async function setUserMcpDefaultAction(params: {
  userMcpServerId: string;
  useByDefault: boolean;
}) {
  try {
    const user = await requireUser();
    await setUserMcpDefault({
      userId: user.id,
      userMcpServerId: params.userMcpServerId,
      useByDefault: params.useByDefault,
    });
    return { success: true, message: "Default MCP setting updated" } as const;
  } catch (error) {
    return toActionError(error, "Failed to update MCP default");
  }
}

export async function setUserSkillDefaultAction(params: {
  userSkillId: string;
  useByDefault: boolean;
}) {
  try {
    const user = await requireUser();
    await setUserSkillDefault({
      userId: user.id,
      userSkillId: params.userSkillId,
      useByDefault: params.useByDefault,
    });
    return { success: true, message: "Default skill setting updated" } as const;
  } catch (error) {
    return toActionError(error, "Failed to update skill default");
  }
}

export async function warmChatMcpServersAction(params: {
  chatId: string;
  servers: Array<Pick<AgentMcpServerMetadata, "id" | "name" | "endpoint">>;
}): Promise<
  ActionResult<{
    total: number;
    ready: number;
    failed: number;
    results: Awaited<ReturnType<typeof warmPooledMcpServers>>;
  }>
> {
  try {
    await requireUser();

    const results = await warmPooledMcpServers({
      chatId: params.chatId,
      servers: params.servers.map((server) => ({
        id: server.id,
        name: server.name,
        endpoint: server.endpoint,
        sourceType: "external",
      })),
    });

    const ready = results.filter((result) => result.success).length;
    const failed = results.length - ready;

    return {
      success: true,
      message: "MCP servers warmed",
      data: {
        total: results.length,
        ready,
        failed,
        results,
      },
    };
  } catch (error) {
    return toActionError(error, "Failed to warm MCP servers");
  }
}
