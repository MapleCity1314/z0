import { z } from "zod";
import { getAgentCapabilityBoundarySnapshot } from "../agent/plugin-boundary";
import { DomainError, type DomainResult, fail, ok } from "../common/result";
import type {
  ChatIntegrationsDto,
  IntegrationMcpServerDto,
  IntegrationSkillDto,
  SystemIntegrationMarketDto,
  SystemMcpMarketItemDto,
  SystemPluginMarketItemDto,
  SystemSkillMarketItemDto,
} from "@z0/shared-types";

const userIdSchema = z.string().uuid();
const chatIdSchema = z.string().trim().min(1).max(255);
const userOwnedRecordIdSchema = z.string().uuid();
const nameSchema = z.string().trim().min(1).max(128);
const endpointSchema = z.string().trim().min(1).max(2048);
const directorySchema = z.string().trim().min(1).max(4096);
const sourceTypeSchema = z.string().trim().min(1).max(32).default("external");

const chatScopeSchema = z.object({
  userId: userIdSchema,
  chatId: chatIdSchema,
});

const addMcpServerSchema = z.object({
  userId: userIdSchema,
  name: nameSchema,
  endpoint: endpointSchema,
  sourceType: sourceTypeSchema.optional(),
});

const addChatMcpServerSchema = addMcpServerSchema.extend({
  chatId: chatIdSchema,
});

const updateChatMcpStateSchema = z.object({
  userId: userIdSchema,
  chatId: chatIdSchema,
  userMcpServerId: userOwnedRecordIdSchema,
  enabledInChat: z.boolean(),
  useByDefault: z.boolean(),
});

const addSkillSchema = z.object({
  userId: userIdSchema,
  name: nameSchema,
  directory: directorySchema,
  sourceType: sourceTypeSchema.optional(),
});

const addChatSkillSchema = addSkillSchema.extend({
  chatId: chatIdSchema,
});

const updateChatSkillStateSchema = z.object({
  userId: userIdSchema,
  chatId: chatIdSchema,
  userSkillId: userOwnedRecordIdSchema,
  enabledInChat: z.boolean(),
  useByDefault: z.boolean(),
});

const updateUserMcpDefaultSchema = z.object({
  userId: userIdSchema,
  userMcpServerId: userOwnedRecordIdSchema,
  useByDefault: z.boolean(),
});

const updateUserSkillDefaultSchema = z.object({
  userId: userIdSchema,
  userSkillId: userOwnedRecordIdSchema,
  useByDefault: z.boolean(),
});

type OwnedRecord = {
  id: string;
  userId: string;
};

export interface IntegrationsRepository {
  listChatMcpServers(userId: string, chatId: string): Promise<IntegrationMcpServerDto[]>;
  listChatSkills(userId: string, chatId: string): Promise<IntegrationSkillDto[]>;
  listUserMcpServers(userId: string): Promise<IntegrationMcpServerDto[]>;
  listUserSkills(userId: string): Promise<IntegrationSkillDto[]>;
  listSystemMcpServers(): Promise<SystemMcpMarketItemDto[]>;
  listSystemSkills(): Promise<SystemSkillMarketItemDto[]>;
  chatBelongsToUser(chatId: string, userId: string): Promise<boolean>;
  addUserMcpServer(input: {
    userId: string;
    name: string;
    endpoint: string;
    sourceType: string;
  }): Promise<string>;
  addUserSkill(input: {
    userId: string;
    name: string;
    directory: string;
    sourceType: string;
  }): Promise<string>;
  findUserMcpServer(userMcpServerId: string): Promise<OwnedRecord | null>;
  findUserSkill(userSkillId: string): Promise<OwnedRecord | null>;
  setUserMcpDefault(input: {
    userMcpServerId: string;
    useByDefault: boolean;
  }): Promise<void>;
  setUserSkillDefault(input: {
    userSkillId: string;
    useByDefault: boolean;
  }): Promise<void>;
  setChatMcpEnabled(input: {
    chatId: string;
    userMcpServerId: string;
    enabled: boolean;
  }): Promise<void>;
  setChatSkillEnabled(input: {
    chatId: string;
    userSkillId: string;
    enabled: boolean;
  }): Promise<void>;
}

export class IntegrationsService {
  constructor(private readonly repository: IntegrationsRepository) {}

  async getChatIntegrations(
    rawInput: z.infer<typeof chatScopeSchema>,
  ): Promise<DomainResult<ChatIntegrationsDto>> {
    try {
      const input = chatScopeSchema.parse(rawInput);
      await this.assertChatOwned(input.chatId, input.userId);

      const [mcpServers, skills] = await Promise.all([
        this.repository.listChatMcpServers(input.userId, input.chatId),
        this.repository.listChatSkills(input.userId, input.chatId),
      ]);

      return ok({ mcpServers, skills });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async addChatMcpServer(
    rawInput: z.infer<typeof addChatMcpServerSchema>,
  ): Promise<DomainResult<{ userMcpServerId: string }>> {
    try {
      const input = addChatMcpServerSchema.parse(rawInput);
      await this.assertChatOwned(input.chatId, input.userId);

      const userMcpServerId = await this.repository.addUserMcpServer({
        userId: input.userId,
        name: input.name,
        endpoint: input.endpoint,
        sourceType: input.sourceType ?? "external",
      });

      await this.repository.setChatMcpEnabled({
        chatId: input.chatId,
        userMcpServerId,
        enabled: true,
      });

      return ok({ userMcpServerId });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async updateChatMcpServerState(
    rawInput: z.infer<typeof updateChatMcpStateSchema>,
  ): Promise<DomainResult<{ updated: true }>> {
    try {
      const input = updateChatMcpStateSchema.parse(rawInput);
      await this.assertChatOwned(input.chatId, input.userId);
      await this.assertOwnedUserMcpServer(input.userId, input.userMcpServerId);

      await Promise.all([
        this.repository.setChatMcpEnabled({
          chatId: input.chatId,
          userMcpServerId: input.userMcpServerId,
          enabled: input.enabledInChat,
        }),
        this.repository.setUserMcpDefault({
          userMcpServerId: input.userMcpServerId,
          useByDefault: input.useByDefault,
        }),
      ]);

      return ok({ updated: true });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async getUserIntegrationSettings(
    rawUserId: string,
  ): Promise<DomainResult<ChatIntegrationsDto>> {
    try {
      const userId = userIdSchema.parse(rawUserId);
      const [mcpServers, skills] = await Promise.all([
        this.repository.listUserMcpServers(userId),
        this.repository.listUserSkills(userId),
      ]);

      return ok({ mcpServers, skills });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async getSystemIntegrationMarket(): Promise<DomainResult<SystemIntegrationMarketDto>> {
    try {
      const [mcpServers, skills] = await Promise.all([
        this.repository.listSystemMcpServers(),
        this.repository.listSystemSkills(),
      ]);

      const snapshot = getAgentCapabilityBoundarySnapshot();
      const plugins: SystemPluginMarketItemDto[] = snapshot.pluginInventory.map(
        (plugin) => ({
          pluginId: plugin.id,
          name: plugin.name,
          status: plugin.status,
          runtimeStatus: plugin.runtimeStatus,
          description: plugin.description,
          highlights: plugin.highlights,
          tools: plugin.tools,
          skills: plugin.skills,
          mcpServers: plugin.mcpServers,
          uiPanels: plugin.uiPanels,
          workflows: plugin.workflows,
          subagentRoles: plugin.subagentRoles,
          dependencies: plugin.dependencies,
        }),
      );

      return ok({ mcpServers, skills, plugins });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async addUserMcpServer(
    rawInput: z.infer<typeof addMcpServerSchema>,
  ): Promise<DomainResult<{ userMcpServerId: string }>> {
    try {
      const input = addMcpServerSchema.parse(rawInput);
      const userMcpServerId = await this.repository.addUserMcpServer({
        userId: input.userId,
        name: input.name,
        endpoint: input.endpoint,
        sourceType: input.sourceType ?? "external",
      });

      return ok({ userMcpServerId });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async setUserMcpDefault(
    rawInput: z.infer<typeof updateUserMcpDefaultSchema>,
  ): Promise<DomainResult<{ updated: true }>> {
    try {
      const input = updateUserMcpDefaultSchema.parse(rawInput);
      await this.assertOwnedUserMcpServer(input.userId, input.userMcpServerId);

      await this.repository.setUserMcpDefault({
        userMcpServerId: input.userMcpServerId,
        useByDefault: input.useByDefault,
      });

      return ok({ updated: true });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async addChatSkill(
    rawInput: z.infer<typeof addChatSkillSchema>,
  ): Promise<DomainResult<{ userSkillId: string }>> {
    try {
      const input = addChatSkillSchema.parse(rawInput);
      await this.assertChatOwned(input.chatId, input.userId);

      const userSkillId = await this.repository.addUserSkill({
        userId: input.userId,
        name: input.name,
        directory: input.directory,
        sourceType: input.sourceType ?? "external",
      });

      await this.repository.setChatSkillEnabled({
        chatId: input.chatId,
        userSkillId,
        enabled: true,
      });

      return ok({ userSkillId });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async updateChatSkillState(
    rawInput: z.infer<typeof updateChatSkillStateSchema>,
  ): Promise<DomainResult<{ updated: true }>> {
    try {
      const input = updateChatSkillStateSchema.parse(rawInput);
      await this.assertChatOwned(input.chatId, input.userId);
      await this.assertOwnedUserSkill(input.userId, input.userSkillId);

      await Promise.all([
        this.repository.setChatSkillEnabled({
          chatId: input.chatId,
          userSkillId: input.userSkillId,
          enabled: input.enabledInChat,
        }),
        this.repository.setUserSkillDefault({
          userSkillId: input.userSkillId,
          useByDefault: input.useByDefault,
        }),
      ]);

      return ok({ updated: true });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async addUserSkill(
    rawInput: z.infer<typeof addSkillSchema>,
  ): Promise<DomainResult<{ userSkillId: string }>> {
    try {
      const input = addSkillSchema.parse(rawInput);
      const userSkillId = await this.repository.addUserSkill({
        userId: input.userId,
        name: input.name,
        directory: input.directory,
        sourceType: input.sourceType ?? "external",
      });

      return ok({ userSkillId });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async setUserSkillDefault(
    rawInput: z.infer<typeof updateUserSkillDefaultSchema>,
  ): Promise<DomainResult<{ updated: true }>> {
    try {
      const input = updateUserSkillDefaultSchema.parse(rawInput);
      await this.assertOwnedUserSkill(input.userId, input.userSkillId);

      await this.repository.setUserSkillDefault({
        userSkillId: input.userSkillId,
        useByDefault: input.useByDefault,
      });

      return ok({ updated: true });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  private async assertChatOwned(chatId: string, userId: string) {
    const ownsChat = await this.repository.chatBelongsToUser(chatId, userId);
    if (!ownsChat) {
      throw new DomainError({
        code: "chat_forbidden",
        message: "Chat not found or access denied",
      });
    }
  }

  private async assertOwnedUserMcpServer(userId: string, userMcpServerId: string) {
    const record = await this.repository.findUserMcpServer(userMcpServerId);
    if (!record) {
      throw new DomainError({
        code: "mcp_server_not_found",
        message: "MCP server not found",
      });
    }
    if (record.userId !== userId) {
      throw new DomainError({
        code: "mcp_server_forbidden",
        message: "MCP server access denied",
      });
    }
  }

  private async assertOwnedUserSkill(userId: string, userSkillId: string) {
    const record = await this.repository.findUserSkill(userSkillId);
    if (!record) {
      throw new DomainError({
        code: "skill_not_found",
        message: "Skill not found",
      });
    }
    if (record.userId !== userId) {
      throw new DomainError({
        code: "skill_forbidden",
        message: "Skill access denied",
      });
    }
  }

  private toDomainError(error: unknown) {
    if (error instanceof DomainError) {
      return error;
    }
    if (error instanceof z.ZodError) {
      return new DomainError({
        code: "validation_error",
        message: "Invalid integrations input",
        details: { issues: error.issues },
      });
    }
    return new DomainError({
      code: "integrations_unknown_error",
      message:
        error instanceof Error ? error.message : "Unknown integrations error",
    });
  }
}
