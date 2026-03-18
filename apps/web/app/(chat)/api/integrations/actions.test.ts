import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getAgentCapabilityBoundarySnapshot = vi.fn(() => ({}));
const warmPooledMcpServers = vi.fn();
const toSystemPluginMarketItems = vi.fn(() => []);
const getUserMcpServers = vi.fn();
const getUserSkills = vi.fn();

vi.mock("@/lib/session", () => ({
  getCurrentUser,
}));

vi.mock("@z0/backend", () => ({
  getAgentCapabilityBoundarySnapshot,
  warmPooledMcpServers,
}));

vi.mock("@/components/chat/plugin-market", () => ({
  toSystemPluginMarketItems,
}));

vi.mock("@/lib/db/integrations", () => ({
  addMcpServerForChat: vi.fn(),
  addMcpServerForUser: vi.fn(),
  addSkillForChat: vi.fn(),
  addSkillForUser: vi.fn(),
  getChatMcpServers: vi.fn(),
  getChatSkills: vi.fn(),
  getSystemMcpServers: vi.fn(),
  getSystemSkills: vi.fn(),
  getUserMcpServers,
  getUserSkills,
  setChatMcpEnabled: vi.fn(),
  setChatSkillEnabled: vi.fn(),
  setUserMcpDefault: vi.fn(),
  setUserSkillDefault: vi.fn(),
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
    getUserMcpServers.mockRejectedValueOnce(null);
    getUserSkills.mockResolvedValueOnce([]);

    const { getUserIntegrationSettingsAction } = await import("./actions");
    const result = await getUserIntegrationSettingsAction();

    expect(result).toEqual({
      success: false,
      message: "Failed to load user integration settings",
    });
  });
});
