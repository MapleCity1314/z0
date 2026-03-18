import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const apiFetch = vi.fn();
const warmPooledMcpServers = vi.fn();

vi.mock("@/lib/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

vi.mock("@z0/backend", () => ({
  warmPooledMcpServers,
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
});
