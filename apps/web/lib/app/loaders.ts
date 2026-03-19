import type { VersionRecord } from "@z0/backend/modules/versions";
import { apiFetch } from "@/lib/api";

type LoaderActor = {
  id: string;
  role?: string | null;
};

type ProjectPageRecord = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: "vue" | "react" | "nextjs" | "vanilla";
  status: "draft" | "building" | "deployed" | "failed";
  visibility: "private" | "public";
  files: Record<string, string>;
  tags: string[];
  deploymentUrl: string | null;
  deploymentProvider: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  lastDeployedAt: string | null;
};

export async function loadUserProjectsPage(actor: LoaderActor) {
  const projects = await apiFetch<ProjectPageRecord[]>(
    "/v1/projects",
    undefined,
    {
      actor: {
        userId: actor.id,
        role: actor.role ?? "user",
      },
    },
  );

  return projects.map((project) => ({
    ...project,
    buildConfig: null,
    likes: 0,
    views: 0,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    publishedAt: project.publishedAt ? new Date(project.publishedAt) : null,
    lastDeployedAt: project.lastDeployedAt
      ? new Date(project.lastDeployedAt)
      : null,
  }));
}

export async function loadPublishedVersions(limit = 20) {
  const versions = await apiFetch<VersionRecord[]>(
    `/v1/versions/published?limit=${limit}`,
  );

  return versions.map((version) => ({
    ...version,
    createdAt: new Date(version.createdAt),
    updatedAt: new Date(version.updatedAt),
    publishedAt: version.publishedAt ? new Date(version.publishedAt) : null,
  }));
}
