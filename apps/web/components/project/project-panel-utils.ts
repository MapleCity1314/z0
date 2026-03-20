import type { FileSystemTree } from "@webcontainer/api";

export type ProjectFiles = Record<string, string>;

export function convertProjectFilesToFileSystemTree(
  files: ProjectFiles,
): FileSystemTree {
  const tree: Record<string, any> = {};

  for (const [path, content] of Object.entries(files)) {
    const parts = path.split("/").filter(Boolean);
    let current = tree;

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const isLeaf = index === parts.length - 1;

      if (isLeaf) {
        current[part] = {
          file: {
            contents: content,
          },
        };
        continue;
      }

      if (!current[part]) {
        current[part] = {
          directory: {},
        };
      }

      current = current[part].directory;
    }
  }

  return tree as FileSystemTree;
}

export function hasProjectFileChanges(
  files: ProjectFiles,
  originalFiles: ProjectFiles,
) {
  const fileKeys = new Set([
    ...Object.keys(files),
    ...Object.keys(originalFiles),
  ]);

  for (const key of fileKeys) {
    if (files[key] !== originalFiles[key]) {
      return true;
    }
  }

  return false;
}
