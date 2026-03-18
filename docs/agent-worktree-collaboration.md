# Multi-Agent Worktree Collaboration Guide

## Purpose

This document defines how to run multiple coding agents against the `z0` monorepo using isolated Git branches or Git worktrees, while keeping task boundaries, file ownership, and product intent clear.

It is designed to help a newly started agent answer three questions quickly:

1. What part of the product am I responsible for?
2. Which files and docs should I read first?
3. What constraints define "correct" in this repository?

---

## Why Git Worktrees

When multiple agents work on the same monorepo at the same time, each agent should get its own checkout so it can:

- edit files without colliding with another agent's worktree
- run tests independently
- install dependencies independently if needed
- keep branch history scoped to one task

The pnpm docs recommend Git worktrees for this pattern because each worktree has its own checkout and `node_modules`, while package contents can still be shared through pnpm's global store when enabled.

Reference:

- pnpm docs: https://pnpm.io/11.x/git-worktrees

Key takeaways from the pnpm guide:

- create one worktree per agent/task
- keep one branch per concern
- install dependencies inside each worktree
- if you want cheaper multi-worktree installs with pnpm, enable `enableGlobalVirtualStore: true` in `pnpm-workspace.yaml`

Current repository note:

- `pnpm-workspace.yaml` currently does not enable `enableGlobalVirtualStore`
- that is optional for this workflow; Git worktrees still work without it

---

## Required Reading Order For New Agents

Every new agent should read these files in this order before editing:

1. [`AGENTS.md`](/Users/presto/code/work/z0/AGENTS.md)
2. [`docs/product-roadmap.md`](/Users/presto/code/work/z0/docs/product-roadmap.md)
3. [`docs/web-maintainability-plan.md`](/Users/presto/code/work/z0/docs/web-maintainability-plan.md)
4. [`docs/agent-runtime-audit.md`](/Users/presto/code/work/z0/docs/agent-runtime-audit.md)
5. [`docs/architecture.md`](/Users/presto/code/work/z0/docs/architecture.md)

What each file answers:

- `AGENTS.md`: repo rules, architecture boundaries, testing expectations
- `docs/product-roadmap.md`: long-term product direction, core vs plugin model
- `docs/web-maintainability-plan.md`: current extraction plan from `apps/web` to `apps/api` and `packages/backend`
- `docs/agent-runtime-audit.md`: actual current Agent runtime boundaries and gaps
- `docs/architecture.md`: sandbox ownership and monorepo boundary notes

---

## Current Engineering Reality

A new agent should assume the following unless the task explicitly says otherwise:

- `apps/web` is still the main user-facing app and still contains important Agent runtime code
- `apps/api` is the preferred HTTP boundary for non-Agent backend features
- `packages/backend` is the preferred home for reusable business logic and backend orchestration
- `packages/shared-types` should be used for explicit contracts across app boundaries
- `packages/sandbox` is only a mount point for an external repo and should not receive local implementation copies

Important product direction:

- keep the Agent experience in `apps/web` working
- move non-Agent backend logic toward `apps/api` and `packages/backend`
- stabilize `z0 core` before aggressively building new plugins

---

## Worktree Operating Model

Recommended naming:

- worktree directory: `../z0-<task-slug>`
- branch: `feat/<area>-<task-slug>` or `refactor/<area>-<task-slug>`

Example:

```bash
git worktree add ../z0-agent-runtime feat/agent-runtime-boundary
git worktree add ../z0-web-extract refactor/web-api-extraction
git worktree add ../z0-mcp-runtime feat/mcp-runtime-hardening
```

Inside each worktree:

```bash
pnpm install
pnpm check-types
```

Use one worktree per task. Do not ask two agents to edit the same primary file at the same time.

Each agent works on its own current branch inside its own worktree. When a meaningful unit of work is complete and verified, the agent should commit directly on its current branch instead of waiting indefinitely for a larger batch.

---

## Round-Based Execution Rule

Agents must work in short verified rounds, not open-ended edit streaks.

A round means:

1. understand the scoped task
2. inspect the relevant files and nearby tests
3. make a bounded set of changes
4. run targeted verification
5. summarize results and either continue with the next bounded round or commit

Required rule:

- do not continue stacking more implementation work if the previous round has not been verified

Preferred verification after each round:

- run the smallest relevant test command for the touched package
- run `pnpm check-types` when contracts or shared types changed
- if full verification is too expensive, run the narrowest meaningful test and state what remains unverified

Commit rule:

- after a round produces a stable, reviewable result and the relevant verification passes, commit on the current branch
- keep commits scoped to one concern when practical
- the commit message should reflect the actual lane and task

Suggested commit message format:

```text
<area>: <scoped change>
```

Examples:

```text
agent: clarify chat request boundary
admin: move version mutation through api
mcp: harden runtime warmup flow
types: align agent response contracts
```

---

## Default Task Split

These are the safest parallel lanes for this repository.

### Lane 1: Core and Plugin Contract

Goal:

- define how roadmap plugin concepts map onto code boundaries and manifests

Primary docs:

- [`docs/product-roadmap.md`](/Users/presto/code/work/z0/docs/product-roadmap.md)
- [`docs/agent-runtime-audit.md`](/Users/presto/code/work/z0/docs/agent-runtime-audit.md)

Primary files:

- [`packages/backend/src/agent`](/Users/presto/code/work/z0/packages/backend/src/agent)
- [`packages/shared-types/src`](/Users/presto/code/work/z0/packages/shared-types/src)
- [`apps/api/src/routes/agent.ts`](/Users/presto/code/work/z0/apps/api/src/routes/agent.ts)

Avoid editing at the same time as another lane:

- [`packages/backend/src/agent/chat.ts`](/Users/presto/code/work/z0/packages/backend/src/agent/chat.ts)
- [`packages/backend/src/agent/tool-catalog.ts`](/Users/presto/code/work/z0/packages/backend/src/agent/tool-catalog.ts)

### Lane 2: Web To API Extraction

Goal:

- continue moving non-Agent backend access out of `apps/web/lib/db/*`

Primary docs:

- [`docs/web-maintainability-plan.md`](/Users/presto/code/work/z0/docs/web-maintainability-plan.md)
- [`AGENTS.md`](/Users/presto/code/work/z0/AGENTS.md)

Primary files:

- [`apps/web/lib/api.ts`](/Users/presto/code/work/z0/apps/web/lib/api.ts)
- [`apps/web/lib/db`](/Users/presto/code/work/z0/apps/web/lib/db)
- [`apps/web/app/(admin)`](/Users/presto/code/work/z0/apps/web/app/(admin))
- [`apps/api/src/routes`](/Users/presto/code/work/z0/apps/api/src/routes)
- [`packages/backend/src/modules`](/Users/presto/code/work/z0/packages/backend/src/modules)

### Lane 3: Agent Runtime Boundary Cleanup

Goal:

- clarify chat request flow, persistence boundaries, tool execution boundaries, and backend orchestration

Primary docs:

- [`docs/agent-runtime-audit.md`](/Users/presto/code/work/z0/docs/agent-runtime-audit.md)
- [`docs/product-roadmap.md`](/Users/presto/code/work/z0/docs/product-roadmap.md)

Primary files:

- [`apps/web/app/(chat)/api/chat/route.ts`](/Users/presto/code/work/z0/apps/web/app/(chat)/api/chat/route.ts)
- [`apps/web/lib/agent/chat`](/Users/presto/code/work/z0/apps/web/lib/agent/chat)
- [`apps/web/app/(chat)/api/agent/tools/[toolName]/route.ts`](/Users/presto/code/work/z0/apps/web/app/(chat)/api/agent/tools/[toolName]/route.ts)
- [`packages/backend/src/agent/chat.ts`](/Users/presto/code/work/z0/packages/backend/src/agent/chat.ts)
- [`packages/backend/src/agent/request.ts`](/Users/presto/code/work/z0/packages/backend/src/agent/request.ts)
- [`packages/backend/src/agent/prompt.ts`](/Users/presto/code/work/z0/packages/backend/src/agent/prompt.ts)

### Lane 4: Skills and MCP Runtime Hardening

Goal:

- make skill loading and MCP runtime behavior reliable and explicit

Primary docs:

- [`docs/agent-runtime-audit.md`](/Users/presto/code/work/z0/docs/agent-runtime-audit.md)

Primary files:

- [`packages/backend/src/agent/skills.ts`](/Users/presto/code/work/z0/packages/backend/src/agent/skills.ts)
- [`packages/backend/src/agent/mcp.ts`](/Users/presto/code/work/z0/packages/backend/src/agent/mcp.ts)
- [`apps/web/app/(chat)/api/integrations/actions.ts`](/Users/presto/code/work/z0/apps/web/app/(chat)/api/integrations/actions.ts)
- [`apps/web/components/chat/skills-market-dialog.tsx`](/Users/presto/code/work/z0/apps/web/components/chat/skills-market-dialog.tsx)
- [`apps/web/components/chat/mcp-market-dialog.tsx`](/Users/presto/code/work/z0/apps/web/components/chat/mcp-market-dialog.tsx)

### Lane 5: Shared Contracts and Tests

Goal:

- keep DTOs and tests aligned while other lanes change behavior

Primary files:

- [`packages/shared-types/src`](/Users/presto/code/work/z0/packages/shared-types/src)
- [`apps/api/src/app.test.ts`](/Users/presto/code/work/z0/apps/api/src/app.test.ts)
- [`packages/backend/src/modules`](/Users/presto/code/work/z0/packages/backend/src/modules)
- [`packages/backend/src/agent`](/Users/presto/code/work/z0/packages/backend/src/agent)

This lane should avoid inventing new behavior. Its job is to standardize contracts and increase test confidence.

---

## File Index By Product Surface

Use this index to find the right files fast.

### Agent chat surface

- UI and route entry: [`apps/web/app/(chat)`](/Users/presto/code/work/z0/apps/web/app/(chat))
- chat transport route: [`apps/web/app/(chat)/api/chat/route.ts`](/Users/presto/code/work/z0/apps/web/app/(chat)/api/chat/route.ts)
- tool bridge route: [`apps/web/app/(chat)/api/agent/tools/[toolName]/route.ts`](/Users/presto/code/work/z0/apps/web/app/(chat)/api/agent/tools/[toolName]/route.ts)
- chat helpers: [`apps/web/lib/agent/chat`](/Users/presto/code/work/z0/apps/web/lib/agent/chat)
- backend orchestration: [`packages/backend/src/agent`](/Users/presto/code/work/z0/packages/backend/src/agent)

### Admin and non-Agent backend surfaces

- admin pages: [`apps/web/app/(admin)`](/Users/presto/code/work/z0/apps/web/app/(admin))
- API routes: [`apps/api/src/routes`](/Users/presto/code/work/z0/apps/api/src/routes)
- backend modules: [`packages/backend/src/modules`](/Users/presto/code/work/z0/packages/backend/src/modules)
- legacy direct DB calls in web: [`apps/web/lib/db`](/Users/presto/code/work/z0/apps/web/lib/db)

### Project and sandbox surface

- project runtime and tools: [`apps/web/lib/project`](/Users/presto/code/work/z0/apps/web/lib/project)
- project UI: [`apps/web/components/project`](/Users/presto/code/work/z0/apps/web/components/project)
- sandbox boundary note: [`docs/architecture.md`](/Users/presto/code/work/z0/docs/architecture.md)
- shared sandbox contracts: [`packages/shared-types/src/sandbox.ts`](/Users/presto/code/work/z0/packages/shared-types/src/sandbox.ts)

### Auth surface

- auth setup in web: [`apps/web/lib/auth.ts`](/Users/presto/code/work/z0/apps/web/lib/auth.ts)
- auth client: [`apps/web/lib/auth-client.ts`](/Users/presto/code/work/z0/apps/web/lib/auth-client.ts)
- shared auth backend: [`packages/backend/src/auth`](/Users/presto/code/work/z0/packages/backend/src/auth)
- auth routes: [`apps/web/app/(auth)`](/Users/presto/code/work/z0/apps/web/app/(auth))

---

## Non-Negotiable Constraints For New Agents

Every prompt should repeat these constraints:

- do not assume `apps/web` is frontend-only
- prefer `apps/api` + `packages/backend` for new non-Agent backend work
- keep route handlers thin
- do not add new direct DB access in `apps/web` unless the task is Agent-specific and already follows an established pattern
- do not write implementation into `packages/sandbox`
- add or update targeted tests for touched backend or API behavior
- do not break the Agent experience in `apps/web`
- work in verified rounds; do not keep editing without running relevant checks
- once a meaningful verified unit of work is complete, commit it directly on the current branch

---

## Prompt Template: Generic

Use this when creating a new agent for a scoped task:

```text
You are working in the z0 monorepo.

Read these files first:
- AGENTS.md
- docs/agent-worktree-collaboration.md
- docs/product-roadmap.md
- docs/web-maintainability-plan.md
- docs/agent-runtime-audit.md
- docs/architecture.md

Task:
<replace with task>

Constraints:
- Keep the Agent experience in apps/web working.
- Prefer apps/api + packages/backend for new non-Agent backend work.
- Keep route handlers thin.
- Keep contracts explicit and testable.
- Do not add implementation into packages/sandbox.
- Add targeted tests for changed backend or API behavior.

Before editing:
- inspect the nearest existing implementation and tests
- identify the exact files you will own
- avoid overlapping edits with other active agents

Deliverables:
- code changes
- tests for touched behavior
- concise summary of changed files, what was verified, and any residual risks

Execution style:
- work in small verified rounds
- after each round, run the smallest relevant verification before continuing
- when a meaningful unit is done and verified, commit directly to the current branch
```

---

## Prompt Template: Core And Plugin Contract Agent

```text
You own the core/plugin boundary for z0.

Read first:
- AGENTS.md
- docs/agent-worktree-collaboration.md
- docs/product-roadmap.md
- docs/agent-runtime-audit.md

Then inspect:
- packages/backend/src/agent
- packages/shared-types/src
- apps/api/src/routes/agent.ts

Task:
Translate the roadmap's core vs plugin model into concrete code boundaries and contracts. Prefer additive design work that does not break current runtime behavior.

Requirements:
- identify current core-owned capabilities versus future plugin-owned capabilities
- propose or implement explicit plugin-facing contracts where appropriate
- avoid broad refactors that mix runtime behavior changes with package moves
- keep current Agent chat flow functioning

Deliverables:
- code and/or design-oriented scaffolding
- tests if behavior changes
- a short note on migration implications for plugin-project, plugin-search, and plugin-subagents

Execution style:
- do not batch too much speculative refactor work into one round
- verify each round before moving to the next
- commit verified progress directly on the current branch
```

---

## Prompt Template: Web To API Extraction Agent

```text
You own the next step of non-Agent backend extraction in z0.

Read first:
- AGENTS.md
- docs/agent-worktree-collaboration.md
- docs/web-maintainability-plan.md

Then inspect:
- apps/web/lib/api.ts
- apps/web/lib/db
- apps/web/app/(admin)
- apps/api/src/routes
- packages/backend/src/modules

Task:
Move remaining non-Agent apps/web DB usage behind API-backed facades or backend modules without regressing current behavior.

Requirements:
- prefer apps/api and packages/backend over direct DB logic in apps/web
- keep route handlers thin
- align request and response types with shared contracts when practical
- add or update tests in apps/api or packages/backend for touched flows

Avoid:
- changing Agent chat runtime behavior unless strictly required
- introducing duplicate business logic in apps/web

Execution style:
- verify each migration round before starting another
- once a migration slice is stable and verified, commit it on the current branch
```

---

## Prompt Template: Agent Runtime Boundary Agent

```text
You own Agent runtime boundary cleanup in z0.

Read first:
- AGENTS.md
- docs/agent-worktree-collaboration.md
- docs/agent-runtime-audit.md
- docs/product-roadmap.md

Then inspect:
- apps/web/app/(chat)/api/chat/route.ts
- apps/web/lib/agent/chat
- apps/web/app/(chat)/api/agent/tools/[toolName]/route.ts
- packages/backend/src/agent

Task:
Clarify the boundary between web transport, tool bridge execution, and backend orchestration without breaking the current Agent experience.

Requirements:
- keep chat request/response contracts explicit
- keep orchestration logic in packages/backend
- keep web-side route and transport code thin
- preserve current tool behavior unless intentionally changing it
- add targeted tests for changed runtime behavior

Execution style:
- make one runtime boundary change at a time
- run verification after each round before continuing
- commit stable verified progress directly on the current branch
```

---

## Prompt Template: Skills And MCP Agent

```text
You own skills and MCP runtime hardening in z0.

Read first:
- AGENTS.md
- docs/agent-worktree-collaboration.md
- docs/agent-runtime-audit.md

Then inspect:
- packages/backend/src/agent/skills.ts
- packages/backend/src/agent/mcp.ts
- apps/web/app/(chat)/api/integrations/actions.ts
- apps/web/components/chat/skills-market-dialog.tsx
- apps/web/components/chat/mcp-market-dialog.tsx

Task:
Improve the reliability and clarity of skill loading and MCP runtime behavior while preserving existing user-visible settings flows.

Requirements:
- make runtime availability explicit
- keep config storage concerns separate from executable runtime concerns
- preserve approval-aware and auditable behavior
- add targeted tests where runtime behavior changes

Execution style:
- verify each MCP or skill runtime change before stacking another
- commit stable verified progress directly on the current branch
```

---

## Prompt Template: Contracts And Tests Agent

```text
You own shared contracts and test coverage for concurrent z0 changes.

Read first:
- AGENTS.md
- docs/agent-worktree-collaboration.md
- docs/web-maintainability-plan.md
- docs/agent-runtime-audit.md

Then inspect:
- packages/shared-types/src
- apps/api/src/*.test.ts
- packages/backend/src/**/*.test.ts

Task:
Standardize app-boundary types and strengthen tests around changed behavior without introducing unrelated product changes.

Requirements:
- prefer explicit DTOs over inferred page-local shapes
- add tests next to touched backend and API modules
- coordinate with active lanes instead of duplicating behavior changes

Execution style:
- each round should end with concrete verification output
- commit verified progress directly on the current branch
```

---

## Copyable Master Prompt For New Agents

Use this prompt when starting a new agent in its own worktree. Replace the task and lane details as needed.

```text
You are working in the z0 monorepo in your own git worktree and on your own branch.

Read these files first:
- AGENTS.md
- docs/agent-worktree-collaboration.md
- docs/product-roadmap.md
- docs/web-maintainability-plan.md
- docs/agent-runtime-audit.md
- docs/architecture.md

Operating rules:
- Keep the Agent experience in apps/web working.
- Do not assume apps/web is frontend-only.
- Prefer apps/api + packages/backend for new non-Agent backend work.
- Keep route handlers thin.
- Keep contracts explicit and testable.
- Do not add implementation into packages/sandbox.
- Add targeted tests for changed backend or API behavior.
- Work in small verified rounds.
- Do not keep stacking implementation without running relevant checks.
- After a meaningful unit of work is complete and verified, commit it directly on your current branch.

Execution process:
1. Read the required docs.
2. Inspect the exact files and nearest tests for your task.
3. State the files you plan to own.
4. Make one bounded implementation round.
5. Run the smallest meaningful verification for that round.
6. Summarize what changed, what was verified, and what remains.
7. If the round is stable, commit it on the current branch before starting the next round.

Your task:
<replace with exact task>

Suggested lane:
<replace with lane name>

Primary files to inspect first:
<replace with file list>

Definition of done:
- the scoped task is implemented
- affected tests are added or updated
- relevant verification has been run
- residual risks are stated clearly
- verified progress has been committed on the current branch
```

---

## Handoff Format Between Agents

When one agent finishes and another agent continues, the handoff should include:

- branch name
- worktree path
- owned files
- tests run
- open risks
- any files intentionally not touched because another lane owns them

Suggested handoff template:

```text
Branch:
Worktree:
Owned files:
Tests run:
Notable behavior changes:
Open risks:
Do not edit next:
```

---

## Review Checklist

Before merging work from any agent:

- the task stayed within its lane
- no new direct `apps/web` DB access was introduced for non-Agent features
- route handlers remained thin
- tests were added or updated where behavior changed
- `packages/sandbox` was not used as an implementation target
- the change still matches the direction in `docs/product-roadmap.md`
