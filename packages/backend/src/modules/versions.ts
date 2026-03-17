import { z } from "zod";
import { type DomainResult, fail, ok } from "../common/result";

const changelogItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5_000).optional(),
});

const versionStatusSchema = z.enum(["draft", "published", "archived"]);

export const createVersionInputSchema = z.object({
  actorUserId: z.string().uuid(),
  version: z.string().min(1).max(32),
  title: z.string().min(1).max(256),
  description: z.string().max(20_000).optional(),
  type: z.enum(["major", "minor", "patch"]),
  features: z.array(changelogItemSchema).optional(),
  improvements: z.array(changelogItemSchema).optional(),
  bugFixes: z.array(changelogItemSchema).optional(),
  breaking: z.array(changelogItemSchema).optional(),
  highlights: z.array(z.string().min(1).max(256)).optional(),
  migration: z.string().max(20_000).optional(),
  downloadUrl: z.string().url().optional(),
  docsUrl: z.string().url().optional(),
});

export type ChangelogItem = z.infer<typeof changelogItemSchema>;

export type VersionRecord = {
  id: string;
  version: string;
  title: string;
  description: string | null;
  type: "major" | "minor" | "patch";
  features: ChangelogItem[];
  improvements: ChangelogItem[];
  bugFixes: ChangelogItem[];
  breaking: ChangelogItem[];
  highlights: string[];
  migration: string | null;
  status: z.infer<typeof versionStatusSchema>;
  isLatest: boolean;
  publishedBy: string | null;
  downloadUrl: string | null;
  docsUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
};

export interface VersionsRepository {
  create(
    input: Omit<z.infer<typeof createVersionInputSchema>, "actorUserId"> & {
      publishedBy: string;
    },
  ): Promise<VersionRecord>;
  findById(versionId: string): Promise<VersionRecord | null>;
  findByVersion(version: string): Promise<VersionRecord | null>;
  findLatest(): Promise<VersionRecord | null>;
  listPublished(limit: number): Promise<VersionRecord[]>;
  listAll(): Promise<VersionRecord[]>;
  publish(versionId: string, actorUserId: string): Promise<VersionRecord | null>;
  update(
    versionId: string,
    input: Partial<Omit<VersionRecord, "id" | "createdAt" | "updatedAt" | "publishedAt">>,
  ): Promise<VersionRecord | null>;
  archive(versionId: string): Promise<VersionRecord | null>;
  delete(versionId: string): Promise<boolean>;
}

export class VersionsService {
  constructor(private readonly repository: VersionsRepository) {}

  async create(
    rawInput: z.infer<typeof createVersionInputSchema>,
  ): Promise<DomainResult<VersionRecord>> {
    const input = createVersionInputSchema.parse(rawInput);
    return ok(
      await this.repository.create({
        ...input,
        publishedBy: input.actorUserId,
      }),
    );
  }

  async getLatest(): Promise<DomainResult<VersionRecord>> {
    const version = await this.repository.findLatest();
    return version
      ? ok(version)
      : fail({ code: "version_not_found", message: "No version found" });
  }

  async getByNumber(version: string): Promise<DomainResult<VersionRecord>> {
    const record = await this.repository.findByVersion(version);
    return record
      ? ok(record)
      : fail({ code: "version_not_found", message: "Version not found" });
  }

  async getById(versionId: string): Promise<DomainResult<VersionRecord>> {
    const record = await this.repository.findById(versionId);
    return record
      ? ok(record)
      : fail({ code: "version_not_found", message: "Version not found" });
  }

  async listPublished(limit = 50): Promise<DomainResult<VersionRecord[]>> {
    return ok(await this.repository.listPublished(limit));
  }

  async listAll(): Promise<DomainResult<VersionRecord[]>> {
    return ok(await this.repository.listAll());
  }

  async publish(versionId: string, actorUserId: string): Promise<DomainResult<VersionRecord>> {
    const version = await this.repository.publish(versionId, actorUserId);
    return version
      ? ok(version)
      : fail({ code: "version_publish_failed", message: "Failed to publish version" });
  }

  async update(
    versionId: string,
    input: Partial<Omit<VersionRecord, "id" | "createdAt" | "updatedAt" | "publishedAt">>,
  ): Promise<DomainResult<VersionRecord>> {
    const version = await this.repository.update(versionId, input);
    return version
      ? ok(version)
      : fail({ code: "version_update_failed", message: "Failed to update version" });
  }

  async archive(versionId: string): Promise<DomainResult<VersionRecord>> {
    const version = await this.repository.archive(versionId);
    return version
      ? ok(version)
      : fail({ code: "version_archive_failed", message: "Failed to archive version" });
  }

  async remove(versionId: string): Promise<DomainResult<{ deleted: true }>> {
    await this.repository.delete(versionId);
    return ok({ deleted: true });
  }
}
