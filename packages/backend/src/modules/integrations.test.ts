import { describe, expect, it, vi } from "vitest";
import { IntegrationsService, type IntegrationsRepository } from "./integrations";

function makeRepository(): IntegrationsRepository {
  return {
    listChatMcpServers: vi.fn(async () => []),
    listChatSkills: vi.fn(async () => []),
    listUserMcpServers: vi.fn(async () => []),
    listUserSkills: vi.fn(async () => []),
    listSystemMcpServers: vi.fn(async () => []),
    listSystemSkills: vi.fn(async () => []),
    chatBelongsToUser: vi.fn(async () => true),
    addUserMcpServer: vi.fn(
      async () => "11111111-1111-1111-8111-111111111111",
    ),
    addUserSkill: vi.fn(async () => "22222222-2222-2222-8222-222222222222"),
    findUserMcpServer: vi.fn(async () => ({
      id: "11111111-1111-1111-8111-111111111111",
      userId: "33333333-3333-3333-8333-333333333333",
    })),
    findUserSkill: vi.fn(async () => ({
      id: "22222222-2222-2222-8222-222222222222",
      userId: "33333333-3333-3333-8333-333333333333",
    })),
    setUserMcpDefault: vi.fn(async () => {}),
    setUserSkillDefault: vi.fn(async () => {}),
    setChatMcpEnabled: vi.fn(async () => {}),
    setChatSkillEnabled: vi.fn(async () => {}),
  };
}

describe("IntegrationsService", () => {
  it("rejects chat settings access when the chat is not owned by the actor", async () => {
    const repository = makeRepository();
    vi.mocked(repository.chatBelongsToUser).mockResolvedValueOnce(false);

    const service = new IntegrationsService(repository);
    const result = await service.getChatIntegrations({
      userId: "33333333-3333-3333-8333-333333333333",
      chatId: "chat-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("chat_forbidden");
    }
  });

  it("updates chat MCP state only for an owned linked server", async () => {
    const repository = makeRepository();
    const service = new IntegrationsService(repository);

    const result = await service.updateChatMcpServerState({
      userId: "33333333-3333-3333-8333-333333333333",
      chatId: "chat-1",
      userMcpServerId: "11111111-1111-1111-8111-111111111111",
      enabledInChat: true,
      useByDefault: false,
    });

    expect(result.ok).toBe(true);
    expect(repository.setChatMcpEnabled).toHaveBeenCalledWith({
      chatId: "chat-1",
      userMcpServerId: "11111111-1111-1111-8111-111111111111",
      enabled: true,
    });
    expect(repository.setUserMcpDefault).toHaveBeenCalledWith({
      userMcpServerId: "11111111-1111-1111-8111-111111111111",
      useByDefault: false,
    });
  });

  it("rejects default MCP updates for another user's server", async () => {
    const repository = makeRepository();
    vi.mocked(repository.findUserMcpServer).mockResolvedValueOnce({
      id: "11111111-1111-1111-8111-111111111111",
      userId: "44444444-4444-4444-8444-444444444444",
    });

    const service = new IntegrationsService(repository);
    const result = await service.setUserMcpDefault({
      userId: "33333333-3333-3333-8333-333333333333",
      userMcpServerId: "11111111-1111-1111-8111-111111111111",
      useByDefault: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("mcp_server_forbidden");
    }
  });

  it("maps plugin inventory into the system market response", async () => {
    const repository = makeRepository();
    vi.mocked(repository.listSystemMcpServers).mockResolvedValueOnce([
      {
        systemServerId: "mcp-1",
        name: "Docs",
        endpoint: "https://example.com/mcp",
        sourceType: "external",
      },
    ]);
    vi.mocked(repository.listSystemSkills).mockResolvedValueOnce([
      {
        systemSkillId: "skill-1",
        name: "Refactor",
        directory: ".agents/skills/refactor",
        sourceType: "workspace",
      },
    ]);

    const service = new IntegrationsService(repository);
    const result = await service.getSystemIntegrationMarket();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.mcpServers).toHaveLength(1);
      expect(result.data.skills).toHaveLength(1);
      expect(result.data.plugins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            pluginId: "@z0/plugin-project",
          }),
        ]),
      );
    }
  });

  it("validates user-owned skill creation input", async () => {
    const service = new IntegrationsService(makeRepository());
    const result = await service.addUserSkill({
      userId: "not-a-uuid",
      name: "",
      directory: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_error");
    }
  });
});
