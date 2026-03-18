# z0 Agent Guide

## 1. Purpose

This repository is a `pnpm` + `turbo` monorepo for the `z0` product.

Current shape:
- `apps/web`: the main Next.js 16 application. It still contains the Agent-facing UI and chat runtime.
- `apps/api`: the extracted Hono API for non-Agent backend capabilities.
- `packages/backend`: shared backend domain layer, including DB schema, Better Auth setup, and service modules.
- `packages/db`: shared Postgres schema, client, and Drizzle migrations.
- `packages/shared-types`: cross-app contracts.
- `packages/sandbox`: reserved mount point for the external sandbox CLI repo. Only placeholder files belong here.

The codebase is in an active backend extraction phase. Do not assume `web` is frontend-only. Some legacy server logic still exists in `apps/web`, but new non-Agent backend work should prefer `packages/backend` + `apps/api`.

## 2. Product And Engineering Goals

When changing this repo, optimize for these goals in order:

1. Keep the Agent experience in `apps/web` working.
2. Move non-Agent backend logic toward `packages/backend` and `apps/api`.
3. Preserve strong readability for both human review and AI maintenance.
4. Keep contracts explicit and testable.
5. Prefer maintainable performance over clever local optimizations.

Practical interpretation:
- business rules belong in backend modules, not scattered across pages or route handlers
- route handlers should stay thin
- DB access should be centralized behind repositories or backend modules
- shared request and response shapes should be explicit at app boundaries
- every backend feature should have corresponding Vitest coverage

## 3. Current Architecture

### Main application boundaries

- `apps/web/app/(chat)`: primary Agent/chat product surface
- `apps/web/app/(auth)`: Better Auth based sign-in flows
- `apps/web/app/(admin)`: admin UI, now increasingly backed by `apps/api`
- `apps/api/src/app.ts`: Hono app entrypoint
- `apps/api/src/repositories.ts`: API-side repository wiring
- `packages/backend/src/db`: shared schema and DB helpers
- `packages/db/src`: shared schema and DB helpers
- `packages/backend/src/auth`: shared Better Auth configuration
- `packages/backend/src/modules`: domain modules such as projects, feedback, versions, users, and admin

### Preferred layering for non-Agent backend work

Use this direction unless there is a strong reason not to:

`web ui / server component / server action`
-> `apps/web/lib/api.ts`
-> `apps/api` route
-> backend service or module
-> repository / DB

Avoid adding new direct DB reads inside `apps/web` for non-Agent features.

### Authentication

- Authentication is based on Better Auth with GitHub.
- Auth-related shared setup belongs in `packages/backend/src/auth`.
- `apps/web` owns the user-facing auth entrypoints and session consumption.
- Do not introduce Mongo-specific auth changes unless the stack actually adopts Mongo. Current backend is Postgres-oriented.

## 4. Repository Layout

```text
apps/
  web/                  Next.js 16 app, Agent UI, auth UI, admin UI
  api/                  Hono API service
packages/
  db/                   Shared DB schema, client, Drizzle config, migrations
  backend/              Shared backend modules, auth, DB schema, tests
  shared-types/         Cross-app contracts
  config-biome/         Shared Biome config
  typescript-config/    Shared TS config
  sandbox/              Placeholder mount point for external sandbox repo
docs/
  architecture.md       Architecture notes
  agent-worktree-collaboration.md  Multi-agent worktree guide and prompt templates
```

## 5. Commands

Workspace:
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm format`
- `pnpm check-types`
- `pnpm check`
- `pnpm test`

Scoped:
- `pnpm --filter @z0/web dev`
- `pnpm --filter @z0/api dev`
- `pnpm --filter @z0/backend test`
- `pnpm --filter @z0/api test`
- `pnpm --filter @z0/web test`

Database work currently lives in `packages/db` scripts:
- `pnpm --filter @z0/db db:generate`
- `pnpm --filter @z0/db db:migrate`
- `pnpm --filter @z0/db db:push`
- `pnpm --filter @z0/db db:studio`

## 6. Coding Rules

- Use TypeScript `strict` mode assumptions throughout.
- Use 2-space indentation and LF line endings.
- Keep package boundaries explicit. Shared logic should not be duplicated across apps.
- Prefer `PascalCase` for React components, `camelCase` for functions and variables, and `kebab-case` for files unless framework rules require otherwise.
- Prefer simple module APIs with small, named functions over large multi-purpose utilities.
- Add brief comments only when the code is not already self-explanatory.

For backend-facing code:
- keep route handlers thin
- validate input near the boundary
- keep business logic in modules or services
- isolate persistence logic
- avoid mixing auth, validation, SQL, and formatting in one function

## 7. Testing Expectations

Backend work is not complete without tests.

Required defaults:
- add `*.test.ts` or `*.test.tsx` next to the relevant source when practical
- cover backend modules in `packages/backend`
- cover API behavior in `apps/api` when routes or auth behavior change
- run targeted tests for touched packages before finishing

Preferred verification for backend changes:
- `pnpm --filter @z0/backend test`
- `pnpm --filter @z0/api test`
- `pnpm check-types`

If a change affects auth, contracts, or DB boundaries, say explicitly what was verified and what was not.

## 8. Performance And Maintainability Rules

When choosing between speed and maintainability, aim for designs that improve both:

- reduce duplicate data access paths
- prefer clear contracts over implicit object shapes
- batch or cache at the service boundary, not ad hoc in UI code
- use indexes and query cleanup in repository code, not route handlers
- keep admin reads, public reads, and private writes conceptually separate

Do not optimize by pushing complexity into React components or server actions if the same concern belongs in the API or backend module.

## 9. Skills Available In This Workspace

Repository-local skills currently present in `.agents/skills`:

- `ai-sdk`
- `better-auth-best-practices`
- `better-auth-security-best-practices`
- `create-auth-skill`
- `next-best-practices`
- `vercel-composition-patterns`
- `vercel-react-best-practices`

The session may also expose global skills from the user environment. Prefer repository-local skills first when both exist and the local one is sufficient.

## 10. Skill Usage Guidance

Use the smallest relevant set of skills for the task.

Use `ai-sdk` when:
- changing model integration
- editing chat, streaming, tool calling, structured output, or provider code
- updating AI SDK package usage

Use `better-auth-best-practices` or `create-auth-skill` when:
- changing login, session, provider, callback, or auth client/server wiring

Use `better-auth-security-best-practices` when:
- reviewing auth security posture
- changing session handling, cookies, secrets, account linking, or permission-sensitive flows

Use `next-best-practices` when:
- changing app routes, server components, route handlers, metadata, or data loading patterns

Use `vercel-react-best-practices` when:
- refactoring React components for rendering behavior, responsiveness, or bundle impact

Use `vercel-composition-patterns` when:
- components are becoming overly conditional or API shape is getting hard to extend

When a skill clearly matches the task, read its `SKILL.md` first and follow it narrowly. Do not load entire reference trees unless needed.

## 11. Change Strategy For Agents

For parallel branch or worktree execution, read `docs/agent-worktree-collaboration.md` before starting. It defines recommended task lanes, file ownership boundaries, and prompt templates for new agents.

Before making changes:
- inspect the relevant package and the nearest tests
- check whether the logic already exists in `packages/backend` before adding new code in `apps/web`
- prefer extending existing domain modules over creating parallel implementations

While editing:
- keep one concern per commit
- do not reintroduce removed dependencies such as `mem0`
- do not add Mongo-specific dependencies just to silence peer warnings
- avoid touching the external sandbox implementation from this repository

Before finishing:
- run targeted tests and type checks
- summarize residual risk
- check `git status` at the repo root

## 12. Security And Config Notes

- Never commit secrets.
- Treat `.env.example` as the public contract for required environment variables.
- `packages/sandbox` is a mount point for an external repo, not a place for local implementation copies.
- Better Auth may emit optional peer warnings for adapters not in use. Do not install unused infrastructure only to silence those warnings.

## 13. Documentation Style For Future Updates

Keep this file current, but keep it compact.

Update this document when:
- package boundaries change
- preferred backend layering changes
- auth architecture changes
- local skills change

Do not turn this file into a changelog. It should stay as an operating guide for future agents.
