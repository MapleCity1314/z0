import { describe, expect, it, vi } from "vitest";
import {
  VersionsService,
  type VersionRecord,
  type VersionsRepository,
} from "./versions";

function makeVersion(overrides: Partial<VersionRecord> = {}): VersionRecord {
  return {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    version: "1.0.0",
    title: "Initial",
    description: null,
    type: "major",
    features: [],
    improvements: [],
    bugFixes: [],
    breaking: [],
    highlights: [],
    migration: null,
    status: "draft",
    isLatest: false,
    publishedBy: null,
    downloadUrl: null,
    docsUrl: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    publishedAt: null,
    ...overrides,
  };
}

function makeRepository(): VersionsRepository {
  return {
    create: vi.fn(async (input) => makeVersion(input)),
    findById: vi.fn(async () => makeVersion()),
    findByVersion: vi.fn(async () => makeVersion()),
    findLatest: vi.fn(async () => makeVersion({ isLatest: true, status: "published" })),
    listPublished: vi.fn(async () => [makeVersion({ status: "published" })]),
    listAll: vi.fn(async () => [makeVersion()]),
    publish: vi.fn(async (_id, actorUserId) =>
      makeVersion({
        status: "published",
        isLatest: true,
        publishedBy: actorUserId,
        publishedAt: new Date(),
      }),
    ),
    update: vi.fn(async (_id, input) => makeVersion(input)),
    archive: vi.fn(async () => makeVersion({ status: "archived", isLatest: false })),
    delete: vi.fn(async () => true),
  };
}

describe("VersionsService", () => {
  it("publishes a version and marks it as latest", async () => {
    const service = new VersionsService(makeRepository());
    const result = await service.publish(
      "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.isLatest).toBe(true);
      expect(result.data.status).toBe("published");
    }
  });

  it("returns not found when no latest version exists", async () => {
    const repository = makeRepository();
    vi.mocked(repository.findLatest).mockResolvedValueOnce(null);
    const service = new VersionsService(repository);

    const result = await service.getLatest();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("version_not_found");
    }
  });

  it("validates version update input before calling the repository", async () => {
    const repository = makeRepository();
    const service = new VersionsService(repository);

    const result = await service.update(
      "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      {
        downloadUrl: "not-a-url",
      } as Parameters<VersionsService["update"]>[1],
    );

    expect(result.ok).toBe(false);
    expect(repository.update).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.error.code).toBe("validation_error");
    }
  });
});
