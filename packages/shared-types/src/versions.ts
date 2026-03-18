export type VersionType = "major" | "minor" | "patch";

export type VersionStatus = "draft" | "published" | "archived";

export interface ChangelogItemDto {
  title: string;
  description?: string;
}

export interface VersionDto {
  id: string;
  version: string;
  title: string;
  description: string | null;
  type: VersionType;
  features: ChangelogItemDto[];
  improvements: ChangelogItemDto[];
  bugFixes: ChangelogItemDto[];
  breaking: ChangelogItemDto[];
  highlights: string[];
  migration: string | null;
  status: VersionStatus;
  isLatest: boolean;
  publishedBy: string | null;
  downloadUrl: string | null;
  docsUrl: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CreateVersionRequest {
  version: string;
  title: string;
  description?: string;
  type: VersionType;
  features?: ChangelogItemDto[];
  improvements?: ChangelogItemDto[];
  bugFixes?: ChangelogItemDto[];
  breaking?: ChangelogItemDto[];
  highlights?: string[];
  migration?: string;
  downloadUrl?: string;
  docsUrl?: string;
}

export interface UpdateVersionRequest {
  title?: string;
  description?: string | null;
  features?: ChangelogItemDto[];
  improvements?: ChangelogItemDto[];
  bugFixes?: ChangelogItemDto[];
  breaking?: ChangelogItemDto[];
  highlights?: string[];
  migration?: string | null;
  downloadUrl?: string | null;
  docsUrl?: string | null;
}
