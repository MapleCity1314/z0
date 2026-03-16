import type { ProjectTemplate, ProjectType } from "@/lib/project/types";
import nextjsTemplateData from "@/lib/project/templates/registry/nextjs-app.json";
import reactTemplateData from "@/lib/project/templates/registry/react-vite.json";
import vanillaTemplateData from "@/lib/project/templates/registry/vanilla-vite.json";
import vueTemplateData from "@/lib/project/templates/registry/vue-vite.json";

export const TEMPLATE_REGISTRY_UPDATED_AT = "2026-03-07";

export const TEMPLATE_STABLE_VERSIONS = {
  next: "16.1.6",
  react: "19.2.4",
  reactDom: "19.2.4",
  vue: "3.5.29",
  vite: "7.3.1",
  vitePluginReact: "5.1.4",
  vitePluginVue: "6.0.4",
  typescript: "5.9.3",
} as const;

type TemplateType = ProjectType;

type RegistryTemplate = {
  type: TemplateType;
  name: string;
  description: string;
  files: Record<string, string>;
  buildConfig: NonNullable<ProjectTemplate["buildConfig"]>;
  tags: string[];
};

const registryTemplates: RegistryTemplate[] = [
  reactTemplateData as RegistryTemplate,
  vueTemplateData as RegistryTemplate,
  nextjsTemplateData as RegistryTemplate,
  vanillaTemplateData as RegistryTemplate,
];

export function getAllTemplates(): RegistryTemplate[] {
  return registryTemplates;
}

export function getTemplateByType(type: TemplateType): RegistryTemplate {
  const exactMatch = registryTemplates.find((template) => template.type === type);

  if (exactMatch) {
    return exactMatch;
  }

  return reactTemplateData as RegistryTemplate;
}

export function getTemplateFiles(type: TemplateType): Record<string, string> {
  return getTemplateByType(type).files;
}

export function validateTemplateRegistry(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const template of registryTemplates) {
    const packageJson = template.files["package.json"];

    if (!packageJson) {
      errors.push(`${template.type}: missing package.json`);
      continue;
    }

    try {
      JSON.parse(packageJson);
    } catch {
      errors.push(`${template.type}: invalid package.json`);
    }

    if (Object.keys(template.files).length === 0) {
      errors.push(`${template.type}: no template files defined`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
