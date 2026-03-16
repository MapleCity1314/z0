import type { Project } from "@/lib/schema";

/**
 * Project type enum
 */
export type ProjectType = "vue" | "react" | "nextjs" | "vanilla";

/**
 * Project status enum
 */
export type ProjectStatus = "draft" | "building" | "deployed" | "failed";

/**
 * Project visibility enum
 */
export type ProjectVisibility = "private" | "public";

/**
 * Deployment provider enum
 */
export type DeploymentProvider = "vercel" | "netlify" | "cloudflare" | "custom";

/**
 * Project file structure
 */
export interface ProjectFiles {
  [path: string]: string; // file path -> file content
}

/**
 * Build configuration
 */
export interface BuildConfig {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  framework?: string;
  nodeVersion?: string;
}

/**
 * Project template for initialization
 */
export interface ProjectTemplate {
  type: ProjectType;
  name: string;
  description: string;
  files: ProjectFiles;
  buildConfig: BuildConfig;
  tags: string[];
}

/**
 * Project with computed fields
 */
export interface ProjectWithStats extends Project {
  fileCount: number;
  lastModified: string;
  isOwner: boolean;
}

/**
 * Project creation input
 */
export interface CreateProjectInput {
  name: string;
  description?: string;
  type: ProjectType;
  visibility?: ProjectVisibility;
  template?: string; // Template ID or name
}

/**
 * Project update input
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  tags?: string[];
}

/**
 * Deployment input
 */
export interface DeploymentInput {
  provider: DeploymentProvider;
  config?: Record<string, unknown>;
}

/**
 * Community project filters
 */
export interface CommunityFilters {
  type?: ProjectType;
  tags?: string[];
  sortBy?: "recent" | "popular" | "views";
  limit?: number;
}
