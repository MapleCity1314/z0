# Multi-Agent Worktree Collaboration Guide

## Purpose

Use this guide when multiple agents work on `z0` in parallel. The goal is to keep file ownership clear, avoid overlapping edits, and make each round independently verifiable.

## Read Before Editing

Read these files first:

1. [`AGENTS.md`](/Users/presto/code/work/z0/AGENTS.md)
2. [`docs/architecture.md`](/Users/presto/code/work/z0/docs/architecture.md)

Those two files are the durable source of truth for repository boundaries, backend layering, testing expectations, and the sandbox ownership contract.

## Current Defaults

Assume these repository rules unless the task says otherwise:

- keep the Agent experience in `apps/web` working
- prefer `apps/api` plus `packages/backend` for new non-Agent backend work
- keep route handlers thin and business logic in backend modules
- treat `packages/shared-types` as the contract boundary between apps
- do not put local sandbox implementation into `packages/sandbox`

## Worktree Model

Recommended naming:

- worktree directory: `../z0-<task-slug>`
- branch: `feat/<area>-<task-slug>` or `refactor/<area>-<task-slug>`

Example:

```bash
git worktree add ../z0-agent-runtime feat/agent-runtime-boundary
git worktree add ../z0-web-api refactor/web-api-extraction
```

Inside each worktree, run the minimum setup you need:

```bash
pnpm install
pnpm check-types
```

Use one worktree per task. Two agents should not edit the same primary file at the same time.

## Round Rule

Work in short verified rounds:

1. inspect the target files and nearby tests
2. make one bounded change
3. run targeted verification
4. summarize and commit if the round is stable

Do not stack more edits onto an unverified round.

Preferred verification:

- package-level targeted tests for the touched area
- `pnpm check-types` when shared contracts or route inputs change
- if full verification is too expensive, run the narrowest meaningful check and state what remains unverified

## Safe Parallel Lanes

These lanes usually avoid conflicts:

### Lane 1: Agent UI and chat rendering

Primary areas:

- [`apps/web/app/(chat)`](/Users/presto/code/work/z0/apps/web/app/(chat))
- [`apps/web/components/chat`](/Users/presto/code/work/z0/apps/web/components/chat)
- [`apps/web/lib/agent/chat`](/Users/presto/code/work/z0/apps/web/lib/agent/chat)

### Lane 2: Non-Agent web to API migration

Primary areas:

- [`apps/web/app/(admin)`](/Users/presto/code/work/z0/apps/web/app/(admin))
- [`apps/web/lib/api.ts`](/Users/presto/code/work/z0/apps/web/lib/api.ts)
- [`apps/api/src/routes`](/Users/presto/code/work/z0/apps/api/src/routes)
- [`packages/backend/src/modules`](/Users/presto/code/work/z0/packages/backend/src/modules)

### Lane 3: Agent backend orchestration

Primary areas:

- [`packages/backend/src/agent`](/Users/presto/code/work/z0/packages/backend/src/agent)
- [`apps/api/src/routes/agent.ts`](/Users/presto/code/work/z0/apps/api/src/routes/agent.ts)
- [`packages/shared-types/src`](/Users/presto/code/work/z0/packages/shared-types/src)

Avoid overlapping edits on:

- [`packages/backend/src/agent/chat.ts`](/Users/presto/code/work/z0/packages/backend/src/agent/chat.ts)
- [`packages/backend/src/agent/tool-catalog.ts`](/Users/presto/code/work/z0/packages/backend/src/agent/tool-catalog.ts)

### Lane 4: Auth and session flows

Primary areas:

- [`apps/web/app/(auth)`](/Users/presto/code/work/z0/apps/web/app/(auth))
- [`packages/backend/src/auth`](/Users/presto/code/work/z0/packages/backend/src/auth)
- [`apps/web/lib/session.ts`](/Users/presto/code/work/z0/apps/web/lib/session.ts)

### Lane 5: Shared contracts and tests

Primary areas:

- [`packages/shared-types/src`](/Users/presto/code/work/z0/packages/shared-types/src)
- [`apps/api/src`](/Users/presto/code/work/z0/apps/api/src)
- [`packages/backend/src`](/Users/presto/code/work/z0/packages/backend/src)

This lane should align contracts and increase test coverage, not invent new product behavior.

## File Index

Use this quick index to find the right surface:

- Agent chat: [`apps/web/app/(chat)`](/Users/presto/code/work/z0/apps/web/app/(chat)), [`apps/web/lib/agent/chat`](/Users/presto/code/work/z0/apps/web/lib/agent/chat), [`packages/backend/src/agent`](/Users/presto/code/work/z0/packages/backend/src/agent)
- Admin and API-backed product flows: [`apps/web/app/(admin)`](/Users/presto/code/work/z0/apps/web/app/(admin)), [`apps/api/src/routes`](/Users/presto/code/work/z0/apps/api/src/routes), [`packages/backend/src/modules`](/Users/presto/code/work/z0/packages/backend/src/modules)
- Auth: [`apps/web/app/(auth)`](/Users/presto/code/work/z0/apps/web/app/(auth)), [`apps/web/lib/auth-client.ts`](/Users/presto/code/work/z0/apps/web/lib/auth-client.ts), [`packages/backend/src/auth`](/Users/presto/code/work/z0/packages/backend/src/auth)
- Sandbox boundary: [`docs/architecture.md`](/Users/presto/code/work/z0/docs/architecture.md), [`packages/shared-types/src`](/Users/presto/code/work/z0/packages/shared-types/src)

## Handoff Checklist

Before handing work to another agent or opening review, confirm:

- the change matches the boundaries in [`AGENTS.md`](/Users/presto/code/work/z0/AGENTS.md)
- sandbox assumptions still match [`docs/architecture.md`](/Users/presto/code/work/z0/docs/architecture.md)
- the touched package has targeted verification
- `git status` is understood and unrelated user changes were not reverted

## Prompt Template

Use this when starting a new agent:

```text
You are working in the z0 monorepo.

Read these files first:
- AGENTS.md
- docs/agent-worktree-collaboration.md
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

Execution style:
- work in small verified rounds
- after each round, run the smallest relevant verification before continuing
- when a meaningful unit is done and verified, commit directly to the current branch
```
