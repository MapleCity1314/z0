import type { Hono } from "hono";
import { requireActor } from "../actor";
import { jsonResult } from "../http";
import type { AppServices } from "../services";

export function registerIntegrationRoutes(app: Hono, services: AppServices) {
  app.get("/v1/integrations/chats/:chatId", async (c) => {
    const actor = await requireActor(c);
    return jsonResult(
      c,
      await services.integrationsService.getChatIntegrations({
        userId: actor.userId,
        chatId: c.req.param("chatId"),
      }),
    );
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
    return jsonResult(
      c,
      await services.integrationsService.getUserIntegrationSettings(actor.userId),
    );
  });

  app.get("/v1/integrations/market", async (c) => {
    await requireActor(c);
    return jsonResult(c, await services.integrationsService.getSystemIntegrationMarket());
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
