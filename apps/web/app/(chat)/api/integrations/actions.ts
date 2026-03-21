"use server";

import {
  warmPooledMcpServers,
  type AgentMcpServerMetadata,
} from "@z0/backend/agent/mcp";
import type {
  AddMcpServerRequest,
  AddSkillRequest,
  ChatIntegrationsDto,
  SystemIntegrationMarketDto,
  UpdateChatMcpServerStateRequest,
  UpdateChatSkillStateRequest,
  UpdateUserMcpDefaultRequest,
  UpdateUserSkillDefaultRequest,
  UserIntegrationSettingsDto,
} from "@z0/shared-types";
import { apiFetch } from "@/lib/api";
import { AUTHENTICATION_REQUIRED_MESSAGE } from "@/lib/api-errors";
import { getActionErrorMessage } from "@/lib/auth-errors";
import { disconnectOAuthMcpServerForUser } from "@/lib/db/integrations";
import { getCurrentUser } from "@/lib/session";

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

async function getActor() {
  const user = await requireUser();
  return {
    userId: user.id,
    role: user.role,
  };
}

function toActionError(error: unknown, fallback: string) {
  return {
    success: false,
    message: getActionErrorMessage(error, fallback),
  } as const;
}

export async function getChatIntegrationsAction(
  chatId: string,
): Promise<ActionResult<ChatIntegrationsDto>> {
  try {
    const data = await apiFetch<ChatIntegrationsDto>(
      `/v1/integrations/chats/${chatId}`,
      undefined,
      { actor: await getActor() },
    );
    return {
      success: true,
      message: "Chat integrations loaded",
      data,
    };
  } catch (error) {
    return toActionError(error, "Failed to load chat integrations");
  }
}

export async function addChatMcpServerAction(params: {
  chatId: string;
  name: string;
  endpoint: string;
  sourceType?: string;
}) {
  try {
    await apiFetch<{ userMcpServerId: string }>(
      `/v1/integrations/chats/${params.chatId}/mcp-servers`,
      {
        method: "POST",
        body: JSON.stringify({
          name: params.name,
          endpoint: params.endpoint,
          sourceType: params.sourceType,
        } satisfies AddMcpServerRequest),
      },
      { actor: await getActor() },
    );
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
    await apiFetch<{ updated: true }>(
      `/v1/integrations/chats/${params.chatId}/mcp-servers/${params.userMcpServerId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          enabledInChat: params.enabledInChat,
          useByDefault: params.useByDefault,
        } satisfies UpdateChatMcpServerStateRequest),
      },
      { actor: await getActor() },
    );
    return { success: true, message: "MCP settings updated" } as const;
  } catch (error) {
    return toActionError(error, "Failed to update MCP settings");
  }
}

export async function addChatSkillAction(params: {
  chatId: string;
  name: string;
  directory: string;
  sourceType?: string;
}) {
  try {
    await apiFetch<{ userSkillId: string }>(
      `/v1/integrations/chats/${params.chatId}/skills`,
      {
        method: "POST",
        body: JSON.stringify({
          name: params.name,
          directory: params.directory,
          sourceType: params.sourceType,
        } satisfies AddSkillRequest),
      },
      { actor: await getActor() },
    );
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
    await apiFetch<{ updated: true }>(
      `/v1/integrations/chats/${params.chatId}/skills/${params.userSkillId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          enabledInChat: params.enabledInChat,
          useByDefault: params.useByDefault,
        } satisfies UpdateChatSkillStateRequest),
      },
      { actor: await getActor() },
    );
    return { success: true, message: "Skill settings updated" } as const;
  } catch (error) {
    return toActionError(error, "Failed to update skill settings");
  }
}

export async function getUserIntegrationSettingsAction(): Promise<
  ActionResult<UserIntegrationSettingsDto>
> {
  try {
    const data = await apiFetch<UserIntegrationSettingsDto>(
      "/v1/integrations/me",
      undefined,
      { actor: await getActor() },
    );
    return {
      success: true,
      message: "User integration settings loaded",
      data,
    };
  } catch (error) {
    return toActionError(error, "Failed to load user integration settings");
  }
}

export async function getSystemIntegrationMarketAction(): Promise<
  ActionResult<SystemIntegrationMarketDto>
> {
  try {
    const data = await apiFetch<SystemIntegrationMarketDto>(
      "/v1/integrations/market",
      undefined,
      { actor: await getActor() },
    );
    return {
      success: true,
      message: "System integration market loaded",
      data,
    };
  } catch (error) {
    return toActionError(error, "Failed to load system integration market");
  }
}

export async function addUserMcpServerAction(params: {
  name: string;
  endpoint: string;
  sourceType?: string;
}) {
  try {
    await apiFetch<{ userMcpServerId: string }>(
      "/v1/integrations/me/mcp-servers",
      {
        method: "POST",
        body: JSON.stringify({
          name: params.name,
          endpoint: params.endpoint,
          sourceType: params.sourceType,
        } satisfies AddMcpServerRequest),
      },
      { actor: await getActor() },
    );
    return { success: true, message: "MCP server added" } as const;
  } catch (error) {
    return toActionError(error, "Failed to add MCP server");
  }
}

export async function addUserSkillAction(params: {
  name: string;
  directory: string;
  sourceType?: string;
}) {
  try {
    await apiFetch<{ userSkillId: string }>(
      "/v1/integrations/me/skills",
      {
        method: "POST",
        body: JSON.stringify({
          name: params.name,
          directory: params.directory,
          sourceType: params.sourceType,
        } satisfies AddSkillRequest),
      },
      { actor: await getActor() },
    );
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
    await apiFetch<{ updated: true }>(
      `/v1/integrations/me/mcp-servers/${params.userMcpServerId}/default`,
      {
        method: "PATCH",
        body: JSON.stringify({
          useByDefault: params.useByDefault,
        } satisfies UpdateUserMcpDefaultRequest),
      },
      { actor: await getActor() },
    );
    return { success: true, message: "Default MCP setting updated" } as const;
  } catch (error) {
    return toActionError(error, "Failed to update MCP default");
  }
}

export async function disconnectUserMcpServerAction(params: {
  userMcpServerId: string;
}) {
  try {
    const user = await requireUser();
    await disconnectOAuthMcpServerForUser({
      userId: user.id,
      userMcpServerId: params.userMcpServerId,
    });
    return { success: true, message: "Connector disconnected" } as const;
  } catch (error) {
    return toActionError(error, "Failed to disconnect connector");
  }
}

export async function setUserSkillDefaultAction(params: {
  userSkillId: string;
  useByDefault: boolean;
}) {
  try {
    await apiFetch<{ updated: true }>(
      `/v1/integrations/me/skills/${params.userSkillId}/default`,
      {
        method: "PATCH",
        body: JSON.stringify({
          useByDefault: params.useByDefault,
        } satisfies UpdateUserSkillDefaultRequest),
      },
      { actor: await getActor() },
    );
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
