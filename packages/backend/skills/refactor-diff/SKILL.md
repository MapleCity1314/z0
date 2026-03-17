---
name: refactor-diff
description: Plan and apply structured multi-file code refactors using the cheapest safe editing tools first.
---

# Refactor Diff

Use this skill when the task requires coordinated code edits across one or more files and the agent should choose between `searchReplace`, `patchProjectFile`, `generateDiff`, `applyDiff`, and `generateASTPatch`.

## Working rules

1. Inspect before editing. Read the relevant files first and confirm the exact code shape.
2. Prefer the cheapest safe edit primitive:
   - Use `searchReplace` for exact text substitutions.
   - Use `patchProjectFile` for small localized edits when full file context is already known.
   - Use `generateDiff` and `applyDiff` for multi-hunk or multi-file edits that benefit from reviewable patches.
   - Use `generateASTPatch` only when syntax-aware transformation is clearly needed.
3. Keep edits minimal. Do not reformat unrelated code or restructure files unless required by the task.
4. After edits, run the lightest useful verification step, such as file reads, lint, or build, depending on impact.

## Recommended workflow

1. Read the relevant files.
2. Decide whether the change is:
   - exact text replacement
   - localized manual patch
   - reviewed diff
   - syntax-aware transform
3. Apply the edit with the narrowest tool that safely fits the change.
4. Re-read the affected file or files to confirm the result.
5. Run targeted verification if the change affects buildable code paths.
