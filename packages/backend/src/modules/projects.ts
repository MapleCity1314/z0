import { z } from "zod";
import { DomainError, type DomainResult, fail, ok } from "../common/result";

const projectTypeSchema = z.enum(["vue", "react", "nextjs", "vanilla"]);
const projectVisibilitySchema = z.enum(["private", "public"]);
const projectStatusSchema = z.enum(["draft", "building", "deployed", "failed"]);

export const createProjectInputSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(10_000).optional(),
  type: projectTypeSchema,
  visibility: projectVisibilitySchema.optional(),
});

export const updateProjectFilesInputSchema = z.object({
  actorUserId: z.string().uuid(),
  projectId: z.string().uuid(),
  files: z.record(z.string(), z.string()),
});

export const updateProjectMetadataInputSchema = z.object({
  actorUserId: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(10_000).nullable().optional(),
  tags: z.array(z.string().min(1).max(64)).optional(),
});

export const deployProjectInputSchema = z.object({
  actorUserId: z.string().uuid(),
  projectId: z.string().uuid(),
  deploymentUrl: z.string().url(),
  provider: z.string().min(1).max(64),
});

export type ProjectRecord = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: z.infer<typeof projectTypeSchema>;
  status: z.infer<typeof projectStatusSchema>;
  visibility: z.infer<typeof projectVisibilitySchema>;
  files: Record<string, string>;
  tags: string[];
  deploymentUrl: string | null;
  deploymentProvider: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  lastDeployedAt: Date | null;
};

export interface ProjectsRepository {
  create(input: z.infer<typeof createProjectInputSchema>): Promise<ProjectRecord>;
  findById(projectId: string): Promise<ProjectRecord | null>;
  listByUserId(userId: string): Promise<ProjectRecord[]>;
  listPublic(limit: number): Promise<ProjectRecord[]>;
  updateFiles(projectId: string, files: Record<string, string>): Promise<ProjectRecord | null>;
  updateMetadata(
    projectId: string,
    updates: { name?: string; description?: string | null; tags?: string[] },
  ): Promise<ProjectRecord | null>;
  markDeployed(
    projectId: string,
    deployment: { deploymentUrl: string; provider: string; deployedAt: Date },
  ): Promise<ProjectRecord | null>;
  setVisibility(
    projectId: string,
    visibility: "private" | "public",
    publishedAt?: Date | null,
  ): Promise<ProjectRecord | null>;
  delete(projectId: string): Promise<boolean>;
}

export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}

  async create(
    rawInput: z.infer<typeof createProjectInputSchema>,
  ): Promise<DomainResult<ProjectRecord>> {
    const input = createProjectInputSchema.parse(rawInput);
    const project = await this.repository.create(input);
    return ok(project);
  }

  async listByUser(userId: string): Promise<DomainResult<ProjectRecord[]>> {
    return ok(await this.repository.listByUserId(z.string().uuid().parse(userId)));
  }

  async listPublic(limit = 50): Promise<DomainResult<ProjectRecord[]>> {
    return ok(await this.repository.listPublic(limit));
  }

  async getById(actorUserId: string, projectId: string): Promise<DomainResult<ProjectRecord>> {
    try {
      return ok(await this.getOwnedProject(actorUserId, projectId));
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async updateFiles(
    rawInput: z.infer<typeof updateProjectFilesInputSchema>,
  ): Promise<DomainResult<ProjectRecord>> {
    try {
      const input = updateProjectFilesInputSchema.parse(rawInput);

      await this.getOwnedProject(input.actorUserId, input.projectId);
      const updated = await this.repository.updateFiles(input.projectId, input.files);
      if (!updated) {
        throw new DomainError({
          code: "project_update_failed",
          message: "Failed to update project files",
        });
      }
      return ok(updated);
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async updateMetadata(
    rawInput: z.infer<typeof updateProjectMetadataInputSchema>,
  ): Promise<DomainResult<ProjectRecord>> {
    try {
      const input = updateProjectMetadataInputSchema.parse(rawInput);

      await this.getOwnedProject(input.actorUserId, input.projectId);
      const updated = await this.repository.updateMetadata(input.projectId, {
        name: input.name,
        description: input.description,
        tags: input.tags,
      });
      if (!updated) {
        throw new DomainError({
          code: "project_update_failed",
          message: "Failed to update project metadata",
        });
      }
      return ok(updated);
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async deploy(
    rawInput: z.infer<typeof deployProjectInputSchema>,
  ): Promise<DomainResult<ProjectRecord>> {
    try {
      const input = deployProjectInputSchema.parse(rawInput);

      await this.getOwnedProject(input.actorUserId, input.projectId);
      const updated = await this.repository.markDeployed(input.projectId, {
        deploymentUrl: input.deploymentUrl,
        provider: input.provider,
        deployedAt: new Date(),
      });
      if (!updated) {
        throw new DomainError({
          code: "project_deploy_failed",
          message: "Failed to update project deployment",
        });
      }
      return ok(updated);
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async publish(actorUserId: string, projectId: string): Promise<DomainResult<ProjectRecord>> {
    try {
      await this.getOwnedProject(actorUserId, projectId);
      const updated = await this.repository.setVisibility(
        projectId,
        "public",
        new Date(),
      );
      if (!updated) {
        throw new DomainError({
          code: "project_publish_failed",
          message: "Failed to publish project",
        });
      }
      return ok(updated);
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async unpublish(
    actorUserId: string,
    projectId: string,
  ): Promise<DomainResult<ProjectRecord>> {
    try {
      await this.getOwnedProject(actorUserId, projectId);
      const updated = await this.repository.setVisibility(projectId, "private", null);
      if (!updated) {
        throw new DomainError({
          code: "project_publish_failed",
          message: "Failed to unpublish project",
        });
      }
      return ok(updated);
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  async remove(actorUserId: string, projectId: string): Promise<DomainResult<{ deleted: true }>> {
    try {
      await this.getOwnedProject(actorUserId, projectId);
      const deleted = await this.repository.delete(projectId);
      if (!deleted) {
        throw new DomainError({
          code: "project_delete_failed",
          message: "Failed to delete project",
        });
      }
      return ok({ deleted: true });
    } catch (error) {
      return fail(this.toDomainError(error));
    }
  }

  private async getOwnedProject(actorUserId: string, projectId: string) {
    const project = await this.repository.findById(projectId);
    if (!project) {
      throw new DomainError({ code: "project_not_found", message: "Project not found" });
    }
    if (project.userId !== actorUserId) {
      throw new DomainError({ code: "project_forbidden", message: "Project access denied" });
    }
    return project;
  }

  private toDomainError(error: unknown) {
    if (error instanceof DomainError) {
      return error;
    }
    if (error instanceof z.ZodError) {
      return new DomainError({
        code: "validation_error",
        message: "Invalid project input",
        details: { issues: error.issues },
      });
    }
    return new DomainError({
      code: "project_unknown_error",
      message: error instanceof Error ? error.message : "Unknown project error",
    });
  }
}
