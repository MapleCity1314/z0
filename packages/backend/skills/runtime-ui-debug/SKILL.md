---
name: runtime-ui-debug
description: Investigate browser/runtime issues by escalating from static inspection to DOM and screenshot tools only when necessary.
---

# Runtime UI Debug

Use this skill when the task is about runtime-only UI bugs, DOM mismatches, hydration issues, or browser-observed behavior.

## Working rules

1. Start with static evidence first:
   - inspect project files
   - read relevant components
   - inspect route and state wiring
2. Escalate to runtime evidence only if static inspection is insufficient.
3. Prefer the least expensive runtime tool that answers the question:
   - `getServerStatus`
   - `readClientState`
   - `queryElement` / `queryElements`
   - `inspectDOM`
   - `captureScreenshot` / `captureElementScreenshot`
4. Avoid broad screenshot or DOM crawling when a specific selector or state read is enough.
5. Once the cause is identified, switch back to file-editing tools for the actual fix.

## Recommended workflow

1. Read the relevant UI files and route/component boundaries.
2. Determine whether the issue is likely static or runtime-only.
3. If runtime confirmation is needed, use the narrowest DOM or state tool possible.
4. Once verified, return to source files and implement the fix.
5. Re-check the minimal runtime evidence needed to confirm the fix.
