import type { Hono } from "hono";
import { requireActor } from "../actor";
import { jsonResult } from "../http";
import type { AppServices } from "../services";

export function registerIntegrationRoutes(app: Hono, services: AppServices) {
  app.get("/v1/integrations/chats/:chatId", async (c) => {
    const actor = await requireActor(c);
    const chatId = c.req.param("chatId");
    const result = await services.integrationsService.getChatIntegrations({
      userId: actor.userId,
      chatId,
    });

    console.log("[Integrations API] GET /v1/integrations/chats/:chatId", {
      userId: actor.userId,
      chatId,
      success: result.ok,
      mcpCount: result.ok ? result.data.mcpServers.length : 0,
      skillCount: result.ok ? result.data.skills.length : 0,
      mcpServers: result.ok
        ? result.data.mcpServers.map((item) => ({
            userMcpServerId: item.userMcpServerId,
            systemServerId: item.systemServerId,
            name: item.systemServerName,
            enabledInChat: item.enabledInChat,
            useByDefault: item.useByDefault,
          }))
        : [],
      skills: result.ok
        ? result.data.skills.map((item) => ({
            userSkillId: item.userSkillId,
            systemSkillId: item.systemSkillId,
            name: item.systemSkillName,
            enabledInChat: item.enabledInChat,
            useByDefault: item.useByDefault,
          }))
        : [],
    });

    return jsonResult(c, result);
  });

  app.post("/v1/integrations/chats/:chatId/mcp-servers", async (c) => {
    const actor = await requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.integrationsService.addChatMcpServer({
        userId: actor.userId,
        chatId: c.req.param("chatId"),
        name: body.name,
        endpoint: body.endpoint,
        sourceType: body.sourceType,
      }),
      201,
    );
  });

  app.patch(
    "/v1/integrations/chats/:chatId/mcp-servers/:userMcpServerId",
    async (c) => {
      const actor = await requireActor(c);
      const body = await c.req.json();
      return jsonResult(
        c,
        await services.integrationsService.updateChatMcpServerState({
          userId: actor.userId,
          chatId: c.req.param("chatId"),
          userMcpServerId: c.req.param("userMcpServerId"),
          enabledInChat: body.enabledInChat,
          useByDefault: body.useByDefault,
        }),
      );
    },
  );

  app.post("/v1/integrations/chats/:chatId/skills", async (c) => {
    const actor = await requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.integrationsService.addChatSkill({
        userId: actor.userId,
        chatId: c.req.param("chatId"),
        name: body.name,
        directory: body.directory,
        sourceType: body.sourceType,
      }),
      201,
    );
  });

  app.patch(
    "/v1/integrations/chats/:chatId/skills/:userSkillId",
    async (c) => {
      const actor = await requireActor(c);
      const body = await c.req.json();
      return jsonResult(
        c,
        await services.integrationsService.updateChatSkillState({
          userId: actor.userId,
          chatId: c.req.param("chatId"),
          userSkillId: c.req.param("userSkillId"),
          enabledInChat: body.enabledInChat,
          useByDefault: body.useByDefault,
        }),
      );
    },
  );

  app.get("/v1/integrations/me", async (c) => {
    const actor = await requireActor(c);
    const result = await services.integrationsService.getUserIntegrationSettings(
      actor.userId,
    );

    console.log("[Integrations API] GET /v1/integrations/me", {
      userId: actor.userId,
      success: result.ok,
      mcpCount: result.ok ? result.data.mcpServers.length : 0,
      skillCount: result.ok ? result.data.skills.length : 0,
      mcpServers: result.ok
        ? result.data.mcpServers.map((item) => ({
            userMcpServerId: item.userMcpServerId,
            systemServerId: item.systemServerId,
            name: item.systemServerName,
            useByDefault: item.useByDefault,
          }))
        : [],
      skills: result.ok
        ? result.data.skills.map((item) => ({
            userSkillId: item.userSkillId,
            systemSkillId: item.systemSkillId,
            name: item.systemSkillName,
            useByDefault: item.useByDefault,
          }))
        : [],
    });

    return jsonResult(c, result);
  });

  app.get("/v1/integrations/market", async (c) => {
    await requireActor(c);
    const result = await services.integrationsService.getSystemIntegrationMarket();

    console.log("[Integrations API] GET /v1/integrations/market", {
      success: result.ok,
      mcpCount: result.ok ? result.data.mcpServers.length : 0,
      skillCount: result.ok ? result.data.skills.length : 0,
      pluginCount: result.ok ? result.data.plugins.length : 0,
      mcpNames: result.ok ? result.data.mcpServers.map((item) => item.name) : [],
      skillNames: result.ok ? result.data.skills.map((item) => item.name) : [],
    });

    return jsonResult(c, result);
  });

  app.post("/v1/integrations/me/mcp-servers", async (c) => {
    const actor = await requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.integrationsService.addUserMcpServer({
        userId: actor.userId,
        name: body.name,
        endpoint: body.endpoint,
        sourceType: body.sourceType,
      }),
      201,
    );
  });

  app.patch(
    "/v1/integrations/me/mcp-servers/:userMcpServerId/default",
    async (c) => {
      const actor = await requireActor(c);
      const body = await c.req.json();
      return jsonResult(
        c,
        await services.integrationsService.setUserMcpDefault({
          userId: actor.userId,
          userMcpServerId: c.req.param("userMcpServerId"),
          useByDefault: body.useByDefault,
        }),
      );
    },
  );

  app.post("/v1/integrations/me/skills", async (c) => {
    const actor = await requireActor(c);
    const body = await c.req.json();
    return jsonResult(
      c,
      await services.integrationsService.addUserSkill({
        userId: actor.userId,
        name: body.name,
        directory: body.directory,
        sourceType: body.sourceType,
      }),
      201,
    );
  });

  app.patch(
    "/v1/integrations/me/skills/:userSkillId/default",
    async (c) => {
      const actor = await requireActor(c);
      const body = await c.req.json();
      return jsonResult(
        c,
        await services.integrationsService.setUserSkillDefault({
          userId: actor.userId,
          userSkillId: c.req.param("userSkillId"),
          useByDefault: body.useByDefault,
        }),
      );
    },
  );
}
