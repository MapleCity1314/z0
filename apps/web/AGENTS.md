# Ralph Agent Instructions

## Overview

Ralph is an autonomous AI agent loop that runs AI coding tools (Amp or Claude Code) repeatedly until all PRD items are complete. Each iteration is a fresh instance with clean context.

## Commands

```bash
# Run the flowchart dev server
cd flowchart && pnpm run dev

# Build the flowchart
cd flowchart && pnpm run build

# Run Ralph with Amp (default)
./ralph.sh [max_iterations]

# Run Ralph with Claude Code
./ralph.sh --tool claude [max_iterations]
```

## Key Files

- `ralph.sh` - The bash loop that spawns fresh AI instances (supports `--tool amp` or `--tool claude`)
- `prompt.md` - Instructions given to each AMP instance
-  `CLAUDE.md` - Instructions given to each Claude Code instance
- `prd.json.example` - Example PRD format
- `flowchart/` - Interactive React Flow diagram explaining how Ralph works

## Flowchart

The `flowchart/` directory contains an interactive visualization built with React Flow. It's designed for presentations - click through to reveal each step with animations.

To run locally:
```bash
cd flowchart
pnpm install
pnpm run dev
```

## Patterns

- Each iteration spawns a fresh AI instance (Amp or Claude Code) with clean context
- Memory persists via git history, `progress.txt`, and `prd.json`
- Stories should be small enough to complete in one context window
- Always update AGENTS.md with discovered patterns for future iterations


# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js 16 + TypeScript app using the App Router.

- `app/`: route groups and pages (for example `app/(chat)`, `app/(admin)`, `app/(auth)`).
- `components/`: reusable UI and feature components (`components/ui`, `components/chat`, `components/editor`).
- `lib/`: server/client utilities, domain logic, schema helpers, and integrations (`lib/db`, `lib/tools`, `lib/utils`).
- `store/`: Zustand state stores.
- `hooks/`: custom React hooks.
- `drizzle/`: SQL migrations and Drizzle metadata.
- `docs/`: design and product documentation.
- `public/`: static assets.

## Build, Test, and Development Commands
Use the scripts from `package.json`:

- `pnpm run dev`: start local dev server at `http://localhost:3000`.
- `pnpm run build`: create a production build.
- `pnpm run start`: run the production server.
- `pnpm run lint`: run Biome lint checks.
- `pnpm run format`: apply Biome formatting.
- `pnpm run db:generate | db:migrate | db:push | db:studio`: manage Drizzle migrations and schema workflows.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts`/`.tsx`) with 2-space indentation.
- Formatter/linter: Biome (`biome.json`) with Next.js and React recommended rules.
- Components: PascalCase filenames for components (for example `ChatPanel.tsx` style when adding new files).
- Hooks: `use-*.ts` naming in `hooks/`.
- Stores: domain-focused files in `store/` (for example `project.ts`, `executor.ts`).

## Testing Guidelines
There is currently no dedicated test runner configured. Before opening a PR:

- Run `npm run lint` and `npm run build`.
- Validate key user flows manually in `npm run dev`.
- If adding tests, prefer colocated `*.test.ts`/`*.test.tsx` files and keep scope focused to changed behavior.

## Commit & Pull Request Guidelines
Follow the existing commit style seen in history: `type: short description`.

- Common types: `feat`, `chore`, `fix`, `add`, `refactor`.
- Keep commits small and logically grouped.
- PRs should include: purpose summary, major changes, verification steps, related issue links, and screenshots/GIFs for UI updates.

## Security & Configuration Tips
- Keep secrets in `.env.local`; do not commit credentials or tokens.
- Review migration files in `drizzle/` carefully before applying in shared environments.
