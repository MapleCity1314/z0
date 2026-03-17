"use server";

import {
  warmPooledMcpServers,
  type AgentMcpServerMetadata,
} from "@z0/backend";
import { getCurrentUser } from "@/lib/session";
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
    throw new Error("User not authenticated");
  }
  return user;
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
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load chat integrations",
    };
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
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to add MCP server",
    } as const;
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
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update MCP settings",
    } as const;
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
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add skill",
    } as const;
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
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update skill settings",
    } as const;
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
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load user integration settings",
    };
  }
}

export async function getSystemIntegrationMarketAction(): Promise<
  ActionResult<{
    mcpServers: Awaited<ReturnType<typeof getSystemMcpServers>>;
    skills: Awaited<ReturnType<typeof getSystemSkills>>;
  }>
> {
  try {
    await requireUser();
    const [mcpServers, skills] = await Promise.all([
      getSystemMcpServers(),
      getSystemSkills(),
    ]);
    return {
      success: true,
      message: "System integration market loaded",
      data: { mcpServers, skills },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load system integration market",
    };
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
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to add MCP server",
    } as const;
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
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add skill",
    } as const;
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
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update MCP default",
    } as const;
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
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update skill default",
    } as const;
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
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to warm MCP servers",
    };
  }
}
