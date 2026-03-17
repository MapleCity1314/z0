"use server";

import {
  createProjectInputSchema,
  updateProjectFilesInputSchema,
  updateProjectMetadataInputSchema,
  type ProjectRecord,
} from "@z0/backend";
import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { requireAuth } from "@/lib/session";

const projectStatusFilterSchema = z.enum([
  "all",
  "draft",
  "building",
  "deployed",
  "failed",
]);

const createProjectActionSchema = createProjectInputSchema
  .omit({ userId: true })
  .extend({
    files: z.record(z.string(), z.string()).default({}),
  });

const updateProjectInfoSchema = updateProjectMetadataInputSchema.omit({
  actorUserId: true,
  projectId: true,
});

const updateProjectFilesActionSchema = updateProjectFilesInputSchema.omit({
  actorUserId: true,
});

type ProjectActionResult<T> =
  | { success: true; data: T; error?: undefined }
  | { success: false; error: string; data?: undefined };

type ProjectInfo = {
  projectId: string;
  name: string;
  type: ProjectRecord["type"];
  status: ProjectRecord["status"];
  description: string | null;
  tags: string[];
  files: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
};

function toErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return "Invalid project input";
  }
  return error instanceof Error ? error.message : "Unknown project error";
}

async function getActor() {
  const user = await requireAuth();
  return { userId: user.id, role: user.role };
}

async function fetchOwnedProject(projectId: string) {
  const actor = await getActor();
  return apiFetch<ProjectRecord>(`/v1/projects/${projectId}`, undefined, {
    actor,
  });
}

function toProjectInfo(project: ProjectRecord): ProjectInfo {
  return {
    projectId: project.id,
    name: project.name,
    type: project.type,
    status: project.status,
    description: project.description,
    tags: project.tags,
    files: project.files ?? {},
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  };
}

export async function createProjectAction(
  params: z.infer<typeof createProjectActionSchema>,
): Promise<
  ProjectActionResult<{
    projectId: string;
    name: string;
    type: ProjectRecord["type"];
  }>
> {
  try {
    const actor = await getActor();
    const parsed = createProjectActionSchema.parse(params);

    const project = await apiFetch<ProjectRecord>(
      "/v1/projects",
      {
        method: "POST",
        body: JSON.stringify({
          name: parsed.name,
          description: parsed.description,
          type: parsed.type,
          visibility: parsed.visibility,
        }),
      },
      { actor },
    );

    if (Object.keys(parsed.files).length > 0) {
      await apiFetch<ProjectRecord>(
        `/v1/projects/${project.id}/files`,
        {
          method: "PATCH",
          body: JSON.stringify({ files: parsed.files }),
        },
        { actor },
      );
    }

    return {
      success: true,
      data: {
        projectId: project.id,
        name: project.name,
        type: project.type,
      },
    };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function listProjectsAction(params?: {
  status?: z.infer<typeof projectStatusFilterSchema>;
}): Promise<
  ProjectActionResult<{
    projects: Array<{
      id: string;
      name: string;
      type: ProjectRecord["type"];
      status: ProjectRecord["status"];
      description: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    count: number;
  }>
> {
  try {
    const actor = await getActor();
    const status = projectStatusFilterSchema.parse(params?.status ?? "all");
    const projects = await apiFetch<ProjectRecord[]>(
      "/v1/projects",
      undefined,
      {
        actor,
      },
    );

    const filteredProjects =
      status === "all"
        ? projects
        : projects.filter((project) => project.status === status);

    return {
      success: true,
      data: {
        projects: filteredProjects.map((project) => ({
          id: project.id,
          name: project.name,
          type: project.type,
          status: project.status,
          description: project.description,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
        })),
        count: filteredProjects.length,
      },
    };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function getProjectInfoAction(
  projectId: string,
): Promise<ProjectActionResult<ProjectInfo>> {
  try {
    const project = await fetchOwnedProject(z.string().uuid().parse(projectId));
    return { success: true, data: toProjectInfo(project) };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function updateProjectInfoAction(
  projectId: string,
  updates: z.infer<typeof updateProjectInfoSchema>,
): Promise<
  ProjectActionResult<{
    projectId: string;
    name: string;
    description: string | null;
    tags: string[];
  }>
> {
  try {
    const actor = await getActor();
    const parsedProjectId = z.string().uuid().parse(projectId);
    const parsedUpdates = updateProjectInfoSchema.parse(updates);

    const project = await apiFetch<ProjectRecord>(
      `/v1/projects/${parsedProjectId}/metadata`,
      {
        method: "PATCH",
        body: JSON.stringify(parsedUpdates),
      },
      { actor },
    );

    return {
      success: true,
      data: {
        projectId: project.id,
        name: project.name,
        description: project.description,
        tags: project.tags,
      },
    };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function verifyProjectOwnership(
  projectId: string,
): Promise<ProjectActionResult<{ userId: string }>> {
  try {
    const actor = await getActor();
    await apiFetch<ProjectRecord>(
      `/v1/projects/${z.string().uuid().parse(projectId)}`,
      undefined,
      {
        actor,
      },
    );
    return { success: true, data: { userId: actor.userId } };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function updateProjectFilesAction(
  projectId: string,
  newFiles: Record<string, string>,
): Promise<ProjectActionResult<{ projectId: string; filesUpdated: number }>> {
  try {
    const actor = await getActor();
    const parsed = updateProjectFilesActionSchema.parse({
      projectId,
      files: newFiles,
    });
    const project = await apiFetch<ProjectRecord>(
      `/v1/projects/${parsed.projectId}`,
      undefined,
      { actor },
    );

    const updatedFiles = {
      ...(project.files ?? {}),
      ...parsed.files,
    };

    const updated = await apiFetch<ProjectRecord>(
      `/v1/projects/${parsed.projectId}/files`,
      {
        method: "PATCH",
        body: JSON.stringify({ files: updatedFiles }),
      },
      { actor },
    );

    return {
      success: true,
      data: {
        projectId: updated.id,
        filesUpdated: Object.keys(parsed.files).length,
      },
    };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function deleteProjectFileAction(
  projectId: string,
  filePath: string,
): Promise<ProjectActionResult<{ projectId: string; deletedFile: string }>> {
  try {
    const actor = await getActor();
    const parsedProjectId = z.string().uuid().parse(projectId);
    const parsedFilePath = z.string().min(1).parse(filePath);
    const project = await apiFetch<ProjectRecord>(
      `/v1/projects/${parsedProjectId}`,
      undefined,
      { actor },
    );

    const existingFiles = project.files ?? {};
    const { [parsedFilePath]: _deleted, ...remainingFiles } = existingFiles;

    const updated = await apiFetch<ProjectRecord>(
      `/v1/projects/${parsedProjectId}/files`,
      {
        method: "PATCH",
        body: JSON.stringify({ files: remainingFiles }),
      },
      { actor },
    );

    return {
      success: true,
      data: {
        projectId: updated.id,
        deletedFile: parsedFilePath,
      },
    };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}
