# Project Runtime (WebContainer)

This module contains project-specific runtime capabilities for z0 Agent.

## Scope
- WebContainer lifecycle and process management
- Project file operations
- Build, run, and preview operations
- Runtime observability data (console/network/perf)

## Main Files
- `lib/project/web-container-builder.ts`: WebContainer manager and APIs
- `lib/project/db/project-actions.ts`: auth-aware project actions
- `lib/project/tools/*`: AI tools for project operations
- `lib/project/templates/template-registry.ts`: template registry + stable version metadata
- `lib/project/templates/registry/*.json`: external template sources
- `lib/project/types.ts`: project domain types

## Data Flow
1. Create project in DB
2. Initialize WebContainer instance for `projectId`
3. Mount/sync project files
4. Run build/dev/preview commands as needed

## Notes
- Tool registration for project workflows is exposed through `lib/agent/tools.ts`.
- Shared non-project tools remain under `lib/tools/`.
