import { describe, expect, it, vi } from "vitest";
import {
  ProjectsService,
  type ProjectRecord,
  type ProjectsRepository,
} from "./projects";

function makeProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: "11111111-1111-1111-8111-111111111111",
    userId: "22222222-2222-2222-8222-222222222222",
    name: "Demo",
    description: null,
    type: "react",
    status: "draft",
    visibility: "private",
    files: {},
    tags: [],
    deploymentUrl: null,
    deploymentProvider: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    publishedAt: null,
    lastDeployedAt: null,
    ...overrides,
  };
}

function makeRepository(): ProjectsRepository {
  return {
    create: vi.fn(async (input) => makeProject(input)),
    findById: vi.fn(async () => makeProject()),
    listByUserId: vi.fn(async () => [makeProject()]),
    listPublic: vi.fn(async () => [makeProject({ visibility: "public" })]),
    updateFiles: vi.fn(async (_projectId, files) => makeProject({ files })),
    updateMetadata: vi.fn(async (_projectId, updates) =>
      makeProject({
        name: updates.name ?? "Demo",
        description: updates.description ?? null,
        tags: updates.tags ?? [],
      }),
    ),
    markDeployed: vi.fn(async (_projectId, deployment) =>
      makeProject({
        status: "deployed",
        deploymentUrl: deployment.deploymentUrl,
        deploymentProvider: deployment.provider,
        lastDeployedAt: deployment.deployedAt,
      }),
    ),
    setVisibility: vi.fn(async (_projectId, visibility, publishedAt) =>
      makeProject({ visibility, publishedAt: publishedAt ?? null }),
    ),
    delete: vi.fn(async () => true),
  };
}

describe("ProjectsService", () => {
  it("denies access when the actor does not own the project", async () => {
    const repository = makeRepository();
    vi.mocked(repository.findById).mockResolvedValueOnce(makeProject());

    const service = new ProjectsService(repository);
    const result = await service.getById(
      "33333333-3333-3333-8333-333333333333",
      "11111111-1111-1111-8111-111111111111",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("project_forbidden");
    }
  });

  it("publishes an owned project", async () => {
    const service = new ProjectsService(makeRepository());
    const result = await service.publish(
      "22222222-2222-2222-8222-222222222222",
      "11111111-1111-1111-8111-111111111111",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.visibility).toBe("public");
    }
  });

  it("validates file update input", async () => {
    const service = new ProjectsService(makeRepository());
    const result = await service.updateFiles({
      actorUserId: "not-a-uuid",
      projectId: "11111111-1111-1111-8111-111111111111",
      files: {},
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_error");
    }
  });
});
