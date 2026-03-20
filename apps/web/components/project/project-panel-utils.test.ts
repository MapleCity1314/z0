import { describe, expect, it } from "vitest";
import {
  convertProjectFilesToFileSystemTree,
  hasProjectFileChanges,
} from "./project-panel-utils";

describe("project-panel-utils", () => {
  it("converts flat project files into a file system tree", () => {
    const tree = convertProjectFilesToFileSystemTree({
      "src/main.ts": "console.log('hi')",
      "package.json": "{}",
    });

    expect(tree.src).toEqual({
      directory: {
        "main.ts": {
          file: {
            contents: "console.log('hi')",
          },
        },
      },
    });
    expect(tree["package.json"]).toEqual({
      file: {
        contents: "{}",
      },
    });
  });

  it("detects unsaved file changes across added and modified files", () => {
    expect(
      hasProjectFileChanges(
        { "src/main.ts": "next", "README.md": "new" },
        { "src/main.ts": "prev" },
      ),
    ).toBe(true);
    expect(
      hasProjectFileChanges(
        { "src/main.ts": "same" },
        { "src/main.ts": "same" },
      ),
    ).toBe(false);
  });
});
