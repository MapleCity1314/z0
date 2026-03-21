import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const apiFetch = vi.fn();
const warmPooledMcpServers = vi.fn();
const disconnectOAuthMcpServerForUser = vi.fn();

vi.mock("@/lib/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

vi.mock("@z0/backend/agent/mcp", () => ({
  warmPooledMcpServers,
}));

vi.mock("@/lib/db/integrations", () => ({
  disconnectOAuthMcpServerForUser,
}));

describe("integration actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes missing-session failures for user integration settings", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const { getUserIntegrationSettingsAction } = await import("./actions");
    const result = await getUserIntegrationSettingsAction();

    expect(result).toEqual({
      success: false,
      message: "Authentication required",
    });
  });

  it("falls back when integration settings loading throws a non-error", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "user-1" });
    apiFetch.mockRejectedValueOnce(null);

    const { getUserIntegrationSettingsAction } = await import("./actions");
    const result = await getUserIntegrationSettingsAction();

    expect(result).toEqual({
      success: false,
      message: "Failed to load user integration settings",
    });
  });

  it("forwards actor headers when loading chat integrations through the API", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "user-1", role: "user" });
    apiFetch.mockResolvedValueOnce({
      mcpServers: [],
      skills: [],
    });

    const { getChatIntegrationsAction } = await import("./actions");
    const result = await getChatIntegrationsAction("chat-1");

    expect(result).toEqual({
      success: true,
      message: "Chat integrations loaded",
      data: {
        mcpServers: [],
        skills: [],
      },
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/v1/integrations/chats/chat-1",
      undefined,
      {
        actor: {
          userId: "user-1",
          role: "user",
        },
      },
    );
  });

  it("forwards sourceType when adding a market MCP server", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "user-1", role: "user" });
    apiFetch.mockResolvedValueOnce({ userMcpServerId: "mcp-user-1" });

    const { addChatMcpServerAction } = await import("./actions");
    const result = await addChatMcpServerAction({
      chatId: "chat-1",
      name: "GitHub",
      endpoint: "https://example.com/github/mcp",
      sourceType: "market",
    });

    expect(result).toEqual({
      success: true,
      message: "MCP server linked to chat",
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/v1/integrations/chats/chat-1/mcp-servers",
      {
        method: "POST",
        body: JSON.stringify({
          name: "GitHub",
          endpoint: "https://example.com/github/mcp",
          sourceType: "market",
        }),
      },
      {
        actor: {
          userId: "user-1",
          role: "user",
        },
      },
    );
  });

  it("disconnects a user connector through the server action", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "user-1", role: "user" });
    disconnectOAuthMcpServerForUser.mockResolvedValueOnce(undefined);

    const { disconnectUserMcpServerAction } = await import("./actions");
    const result = await disconnectUserMcpServerAction({
      userMcpServerId: "user-mcp-1",
    });

    expect(result).toEqual({
      success: true,
      message: "Connector disconnected",
    });
    expect(disconnectOAuthMcpServerForUser).toHaveBeenCalledWith({
      userId: "user-1",
      userMcpServerId: "user-mcp-1",
    });
  });
});
