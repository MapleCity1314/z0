import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Hono } from "hono";
import { ok, fail } from "@z0/backend";
import type {
  AgentCapabilityBoundarySnapshot,
  AdminDashboardActivityDto,
  AdminDashboardStatsDto,
  AdminFeedbackStatsDto,
  ApiErrorPayload,
  ApiSuccessPayload,
  VersionDto,
} from "@z0/shared-types";

const actorHeaders = {
  "x-user-id": "550e8400-e29b-41d4-a716-446655440000",
};

const adminHeaders = {
  ...actorHeaders,
  "x-user-role": "admin",
};

type ApiErrorResponse = {
  error: ApiErrorPayload;
};

type ApiSuccessResponse<T> = ApiSuccessPayload<T>;

function createServices() {
  return {
    usersService: {
      getProfile: vi.fn(),
      updateProfile: vi.fn(),
    },
    projectsService: {
      listByUser: vi.fn(),
      listPublic: vi.fn(),
      create: vi.fn(),
      getById: vi.fn(),
      updateFiles: vi.fn(),
      updateMetadata: vi.fn(),
      deploy: vi.fn(),
      publish: vi.fn(),
      unpublish: vi.fn(),
      remove: vi.fn(),
    },
    feedbackService: {
      getMine: vi.fn(),
      submit: vi.fn(),
      getOne: vi.fn(),
      remove: vi.fn(),
      listAll: vi.fn(),
      updateStatus: vi.fn(),
      respond: vi.fn(),
    },
    versionsService: {
      getLatest: vi.fn(),
      listPublished: vi.fn(),
      getByNumber: vi.fn(),
      getById: vi.fn(),
      listAll: vi.fn(),
      create: vi.fn(),
      publish: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      remove: vi.fn(),
    },
    adminService: {
      getDashboardStats: vi.fn(),
      getDashboardActivity: vi.fn(),
      listUsers: vi.fn(),
      listProjects: vi.fn(),
      listChats: vi.fn(),
      getFeedbackStats: vi.fn(),
      getUserDetail: vi.fn(),
      getProjectDetail: vi.fn(),
      getFeedbackDetail: vi.fn(),
      getChatDetail: vi.fn(),
    },
  };
}

describe("createApp", () => {
  const services = createServices();
  let app: Hono;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? "postgres://user:pass@localhost:5432/z0";
    const { createApp } = await import("./app");
    app = createApp({
      usersService: services.usersService as never,
      projectsService: services.projectsService as never,
      feedbackService: services.feedbackService as never,
      versionsService: services.versionsService as never,
      adminService: services.adminService as never,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when actor headers are missing", async () => {
    const response = await app.request("/v1/projects");
    const payload = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(401);
    expect(payload.error.message).toBe("Unauthorized");
    expect(payload.error.code).toBe("unauthorized");
  });

  it("protects the agent chat route with actor headers", async () => {
    const response = await app.request("/v1/agent/chat", {
      method: "POST",
      body: JSON.stringify({
        id: "chat-1",
        messages: [],
        model: "z0-mini",
        isReasoning: false,
        webSearchEnabled: false,
        projectId: null,
      }),
      headers: { "content-type": "application/json" },
    });
    const payload = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(401);
    expect(payload.error.message).toBe("Unauthorized");
  });

  it("returns the agent capability boundary snapshot for authenticated actors", async () => {
    const response = await app.request("/v1/agent/capabilities", {
      headers: actorHeaders,
    });
    const payload =
      (await response.json()) as ApiSuccessResponse<AgentCapabilityBoundarySnapshot>;

    expect(response.status).toBe(200);
    expect(payload.data.contractVersion).toBe(
      "2026-03-core-plugin-boundary-v2",
    );
    expect(payload.data.pluginManifests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "@z0/plugin-project" }),
        expect.objectContaining({ id: "@z0/plugin-search" }),
        expect.objectContaining({ id: "@z0/plugin-subagents" }),
      ]),
    );
    expect(payload.data.pluginInventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "@z0/plugin-project",
          highlights: expect.arrayContaining([
            "Project lifecycle and workspace management",
          ]),
          tools: ["project:*"],
          workflows: ["modify-run-inspect-iterate"],
        }),
      ]),
    );
  });

  it("returns current user profile", async () => {
    services.usersService.getProfile.mockResolvedValue(
      ok({
        id: actorHeaders["x-user-id"],
        name: "Ada",
        email: "ada@example.com",
        avatar: null,
        role: "user",
        status: "active",
        emailVerified: true,
        createdAt: new Date("2026-03-01T00:00:00Z"),
        updatedAt: new Date("2026-03-02T00:00:00Z"),
      }),
    );

    const response = await app.request("/v1/users/me", {
      headers: actorHeaders,
    });
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(payload.data.name).toBe("Ada");
    expect(services.usersService.getProfile).toHaveBeenCalledWith(
      actorHeaders["x-user-id"],
    );
  });

  it("returns the authenticated user's projects", async () => {
    services.projectsService.listByUser.mockResolvedValue(
      ok([
        {
          id: "prj-1",
          userId: actorHeaders["x-user-id"],
          name: "Alpha",
          description: null,
          type: "nextjs",
          status: "draft",
          visibility: "private",
          files: {},
          tags: [],
          deploymentUrl: null,
          deploymentProvider: null,
          createdAt: new Date("2026-03-01T00:00:00Z"),
          updatedAt: new Date("2026-03-02T00:00:00Z"),
          publishedAt: null,
          lastDeployedAt: null,
        },
      ]),
    );

    const response = await app.request("/v1/projects", {
      headers: actorHeaders,
    });
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].name).toBe("Alpha");
  });

  it("returns the authenticated user's feedback", async () => {
    services.feedbackService.getMine.mockResolvedValue(
      ok([
        {
          id: "fb-1",
          userId: actorHeaders["x-user-id"],
          type: "feature",
          category: "ui",
          title: "Add shortcuts",
          content: "Please add keyboard shortcuts",
          status: "pending",
          priority: "medium",
          metadata: null,
          attachments: [],
          adminResponse: null,
          respondedBy: null,
          respondedAt: null,
          createdAt: new Date("2026-03-01T00:00:00Z"),
          updatedAt: new Date("2026-03-02T00:00:00Z"),
        },
      ]),
    );

    const response = await app.request("/v1/feedback", {
      headers: actorHeaders,
    });
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(payload.data[0].title).toBe("Add shortcuts");
  });

  it("returns the latest public version", async () => {
    services.versionsService.getLatest.mockResolvedValue(
      ok({
        id: "ver-1",
        version: "1.2.0",
        title: "Spring release",
        description: null,
        type: "minor",
        features: [],
        improvements: [],
        bugFixes: [],
        breaking: [],
        highlights: [],
        migration: null,
        status: "published",
        isLatest: true,
        publishedBy: actorHeaders["x-user-id"],
        downloadUrl: null,
        docsUrl: null,
        createdAt: new Date("2026-03-01T00:00:00Z"),
        updatedAt: new Date("2026-03-02T00:00:00Z"),
        publishedAt: new Date("2026-03-03T00:00:00Z"),
      }),
    );

    const response = await app.request("/v1/versions/latest");
    const payload = (await response.json()) as ApiSuccessPayload<VersionDto>;

    expect(response.status).toBe(200);
    expect(payload.data.version).toBe("1.2.0");
    expect(payload.data.publishedAt).toBe("2026-03-03T00:00:00.000Z");
  });

  it("blocks admin routes for non-admin users", async () => {
    const response = await app.request("/v1/admin/dashboard", {
      headers: actorHeaders,
    });
    const payload = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("forbidden");
    expect(payload.error.message).toBe("Forbidden");
  });

  it("returns the standard internal error payload for unexpected failures", async () => {
    services.projectsService.listByUser.mockRejectedValueOnce(new Error("boom"));

    const response = await app.request("/v1/projects", {
      headers: actorHeaders,
    });
    const payload = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(500);
    expect(payload.error).toEqual({
      code: "internal_error",
      message: "Internal server error",
    });
  });

  it("returns dashboard and activity payloads for admins", async () => {
    services.adminService.getDashboardStats.mockResolvedValue({
      users: { total: 4, today: 1 },
      chats: { total: 6, today: 2 },
      projects: { total: 3, public: 1 },
      feedback: { total: 2, pending: 1 },
    });
    services.adminService.getDashboardActivity.mockResolvedValue({
      recentUsers: [
        {
          id: actorHeaders["x-user-id"],
          name: "Ada",
          email: "ada@example.com",
          avatar: null,
          createdAt: new Date("2026-03-01T00:00:00Z"),
        },
      ],
      recentChats: [],
      recentFeedback: [],
    });

    const [dashboardResponse, activityResponse] = await Promise.all([
      app.request("/v1/admin/dashboard", { headers: adminHeaders }),
      app.request("/v1/admin/dashboard/activity", { headers: adminHeaders }),
    ]);

    expect(dashboardResponse.status).toBe(200);
    expect(activityResponse.status).toBe(200);
    expect(
      ((await dashboardResponse.json()) as ApiSuccessPayload<AdminDashboardStatsDto>)
        .data.users.total,
    ).toBe(4);
    expect(
      ((await activityResponse.json()) as ApiSuccessPayload<AdminDashboardActivityDto>)
        .data.recentUsers,
    ).toHaveLength(1);
  });

  it("returns admin feedback stats", async () => {
    services.adminService.getFeedbackStats.mockResolvedValue({
      byStatus: [{ status: "pending", count: 2 }],
      byType: [{ type: "bug", count: 1 }],
      byPriority: [{ priority: "high", count: 1 }],
    });

    const response = await app.request("/v1/admin/feedback/stats", {
      headers: adminHeaders,
    });
    const payload =
      (await response.json()) as ApiSuccessPayload<AdminFeedbackStatsDto>;

    expect(response.status).toBe(200);
    expect(payload.data.byStatus[0].count).toBe(2);
  });

  it("returns version details for admins", async () => {
    services.versionsService.getById.mockResolvedValue(
      ok({
        id: "ver-1",
        version: "1.2.0",
        title: "Spring release",
        description: null,
        type: "minor",
        features: [],
        improvements: [],
        bugFixes: [],
        breaking: [],
        highlights: [],
        migration: null,
        status: "published",
        isLatest: true,
        publishedBy: actorHeaders["x-user-id"],
        downloadUrl: null,
        docsUrl: null,
        createdAt: new Date("2026-03-01T00:00:00Z"),
        updatedAt: new Date("2026-03-02T00:00:00Z"),
        publishedAt: new Date("2026-03-03T00:00:00Z"),
      }),
    );

    const response = await app.request("/v1/admin/versions/ver-1", {
      headers: adminHeaders,
    });
    const payload = (await response.json()) as ApiSuccessPayload<VersionDto>;

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe("ver-1");
    expect(payload.data.createdAt).toBe("2026-03-01T00:00:00.000Z");
  });

  it("returns 404 for missing admin project details", async () => {
    services.adminService.getProjectDetail.mockResolvedValue(null);

    const response = await app.request("/v1/admin/projects/missing", {
      headers: adminHeaders,
    });
    const payload = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("project_not_found");
  });

  it("maps domain validation failures to HTTP status codes", async () => {
    services.feedbackService.respond.mockResolvedValue(
      fail({
        code: "validation_error",
        message: "Feedback response is required",
      }),
    );

    const response = await app.request("/v1/admin/feedback/fb-1/respond", {
      method: "POST",
      headers: {
        ...adminHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({ response: "" }),
    });
    const payload = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(400);
    expect(payload.error.message).toBe("Feedback response is required");
  });

  it("updates feedback status for admins", async () => {
    services.feedbackService.updateStatus.mockResolvedValue(
      ok({
        id: "fb-1",
        userId: actorHeaders["x-user-id"],
        type: "feature",
        category: null,
        title: "Add shortcuts",
        content: "Please add keyboard shortcuts",
        status: "planned",
        priority: "medium",
        metadata: null,
        attachments: [],
        adminResponse: null,
        respondedBy: null,
        respondedAt: null,
        createdAt: new Date("2026-03-01T00:00:00Z"),
        updatedAt: new Date("2026-03-02T00:00:00Z"),
      }),
    );

    const response = await app.request("/v1/admin/feedback/fb-1/status", {
      method: "PATCH",
      headers: {
        ...adminHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: "planned" }),
    });

    expect(response.status).toBe(200);
    expect(services.feedbackService.updateStatus).toHaveBeenCalledWith(
      "fb-1",
      "planned",
    );
  });

  it("responds to feedback as the authenticated admin", async () => {
    services.feedbackService.respond.mockResolvedValue(
      ok({
        id: "fb-2",
        userId: actorHeaders["x-user-id"],
        type: "bug",
        category: null,
        title: "Broken layout",
        content: "The sidebar overlaps content",
        status: "reviewing",
        priority: "high",
        metadata: null,
        attachments: [],
        adminResponse: "Fix is in progress",
        respondedBy: actorHeaders["x-user-id"],
        respondedAt: new Date("2026-03-03T00:00:00Z"),
        createdAt: new Date("2026-03-01T00:00:00Z"),
        updatedAt: new Date("2026-03-03T00:00:00Z"),
      }),
    );

    const response = await app.request("/v1/admin/feedback/fb-2/respond", {
      method: "POST",
      headers: {
        ...adminHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({ response: "Fix is in progress" }),
    });

    expect(response.status).toBe(200);
    expect(services.feedbackService.respond).toHaveBeenCalledWith(
      "fb-2",
      actorHeaders["x-user-id"],
      "Fix is in progress",
    );
  });

  it("creates and publishes versions as the authenticated admin", async () => {
    services.versionsService.create.mockResolvedValue(
      ok({
        id: "ver-2",
        version: "1.3.0",
        title: "Admin extraction",
        description: "Moves admin writes to api",
        type: "minor",
        features: [],
        improvements: [],
        bugFixes: [],
        breaking: [],
        highlights: [],
        migration: null,
        status: "draft",
        isLatest: false,
        publishedBy: actorHeaders["x-user-id"],
        downloadUrl: null,
        docsUrl: null,
        createdAt: new Date("2026-03-01T00:00:00Z"),
        updatedAt: new Date("2026-03-02T00:00:00Z"),
        publishedAt: null,
      }),
    );
    services.versionsService.publish.mockResolvedValue(
      ok({
        id: "ver-2",
        version: "1.3.0",
        title: "Admin extraction",
        description: "Moves admin writes to api",
        type: "minor",
        features: [],
        improvements: [],
        bugFixes: [],
        breaking: [],
        highlights: [],
        migration: null,
        status: "published",
        isLatest: true,
        publishedBy: actorHeaders["x-user-id"],
        downloadUrl: null,
        docsUrl: null,
        createdAt: new Date("2026-03-01T00:00:00Z"),
        updatedAt: new Date("2026-03-03T00:00:00Z"),
        publishedAt: new Date("2026-03-03T00:00:00Z"),
      }),
    );

    const createResponse = await app.request("/v1/admin/versions", {
      method: "POST",
      headers: {
        ...adminHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        version: "1.3.0",
        title: "Admin extraction",
        description: "Moves admin writes to api",
        type: "minor",
      }),
    });
    const publishResponse = await app.request(
      "/v1/admin/versions/ver-2/publish",
      {
        method: "POST",
        headers: adminHeaders,
      },
    );

    expect(createResponse.status).toBe(201);
    expect(publishResponse.status).toBe(200);
    expect(services.versionsService.create).toHaveBeenCalledWith({
      actorUserId: actorHeaders["x-user-id"],
      version: "1.3.0",
      title: "Admin extraction",
      description: "Moves admin writes to api",
      type: "minor",
      features: undefined,
      improvements: undefined,
      bugFixes: undefined,
      breaking: undefined,
      highlights: undefined,
      migration: undefined,
      downloadUrl: undefined,
      docsUrl: undefined,
    });
    expect(services.versionsService.publish).toHaveBeenCalledWith(
      "ver-2",
      actorHeaders["x-user-id"],
    );
  });

  it("updates versions with the explicit admin DTO fields only", async () => {
    services.versionsService.update.mockResolvedValue(
      ok({
        id: "ver-2",
        version: "1.3.0",
        title: "Retitled release",
        description: null,
        type: "minor",
        features: [],
        improvements: [],
        bugFixes: [],
        breaking: [],
        highlights: [],
        migration: null,
        status: "draft",
        isLatest: false,
        publishedBy: actorHeaders["x-user-id"],
        downloadUrl: null,
        docsUrl: null,
        createdAt: new Date("2026-03-01T00:00:00Z"),
        updatedAt: new Date("2026-03-04T00:00:00Z"),
        publishedAt: null,
      }),
    );

    const response = await app.request("/v1/admin/versions/ver-2", {
      method: "PATCH",
      headers: {
        ...adminHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Retitled release",
        description: null,
        downloadUrl: null,
        id: "ignored-id",
        isLatest: true,
        publishedAt: "2026-03-05T00:00:00Z",
      }),
    });
    const payload = (await response.json()) as ApiSuccessPayload<VersionDto>;

    expect(response.status).toBe(200);
    expect(payload.data.title).toBe("Retitled release");
    expect(services.versionsService.update).toHaveBeenCalledWith("ver-2", {
      title: "Retitled release",
      description: null,
      features: undefined,
      improvements: undefined,
      bugFixes: undefined,
      breaking: undefined,
      highlights: undefined,
      migration: undefined,
      downloadUrl: null,
      docsUrl: undefined,
    });
  });
});
