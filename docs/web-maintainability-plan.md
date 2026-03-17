# Web Maintainability Plan

## Current State

As of 2026-03-17, the repository is in a partial extraction state:

- `apps/web` remains the primary user-facing app for chat, auth, admin, and some legacy backend access.
- `apps/api` already owns most non-Agent read paths for admin, feedback, projects, users, and versions.
- `packages/backend` already contains the reusable domain services and repository contracts for admin, feedback, projects, users, and versions.
- Some non-Agent write flows in `apps/web` still exist as server actions that previously called Drizzle queries directly.
- Agent-specific runtime code still lives mostly inside `apps/web/lib/agent`, `apps/web/lib/tools`, and chat route handlers.

## Architectural Direction

The target layering for non-Agent capabilities is:

`page / server component / client component`
-> `apps/web/lib/* client facade`
-> `apps/api` route
-> `packages/backend` service
-> repository / DB

This keeps React concerns separate from persistence and makes server actions thin orchestration points instead of mixed business logic.

## Composition Rules

The current component tree should move toward these defaults:

- Prefer explicit component variants over boolean-heavy APIs.
- Use provider boundaries only where sibling coordination is needed.
- Keep data loading in server components when possible, and keep client components focused on interaction.
- Treat server actions as UI-triggered mutations, not as a second backend.
- Keep Agent and non-Agent component trees separate so the admin/product surface can evolve without leaking chat/runtime concerns.

## Phased Plan

### Phase 1

Completed in this change:

- Move admin mutation server actions in `apps/web` to the API boundary.
- Reuse backend types in the web admin client contracts.
- Add tests for web admin actions and API admin mutation routes.

### Phase 2

Next recommended step:

- Move remaining non-Agent `apps/web/lib/db/*` usages behind API-backed facades.
- Replace page-local inline response typing with shared contracts for admin/project/version surfaces.
- Audit `app/(admin)` pages for repeated fetch/format logic and extract server-side loaders.

Progress:

- Project management now keeps internal Next.js `server action` entrypoints for UI/tooling flows, but those actions call the API boundary instead of writing to the DB directly.
- Unsupported UI-only project type variants should be removed whenever they do not exist in backend contracts.

### Phase 3

After non-Agent boundaries are stable:

- Split Agent runtime into clearer modules: chat orchestration, tool execution, memory, model selection, and project workspace integration.
- Separate presentational chat components from transport/state components with composition-first APIs.
- Reduce oversized route handlers by extracting command/use-case modules with explicit input/output types.

### Phase 4

Final hardening:

- Align shared contracts between DB-backed records, backend services, and web-facing DTOs.
- Add route-level and module-level tests for migrated Agent behavior.
- Remove deprecated direct DB paths from `apps/web` once replacement coverage is complete.
