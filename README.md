<p align="center">
  <img src="assets/brand/logo/z0-mark.svg" alt="z0" width="72" />
</p>

<h1 align="center">z0</h1>

<p align="center">
  An extensible, production-grade AI Agent platform built for engineers.<br/>
  Multi-model · MCP-native · Skill-driven · Project-aware
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/AI_SDK-6-violet?logo=vercel" alt="AI SDK" />
  <img src="https://img.shields.io/badge/MCP-native-orange" alt="MCP" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

---

## What is z0?

z0 is a full-stack AI Agent platform designed for engineers who want a principled, extensible foundation rather than a black-box chat wrapper. It combines a production-ready conversation engine, a composable tool runtime, first-class MCP server integration, and a project-aware development environment — all in a single monorepo.

The platform exposes the agent's capabilities through three orthogonal extension points: **Skills** (reusable operating procedures injected into the prompt), **MCP Servers** (external tool providers over HTTP or stdio), and a **typed Tool Catalog** (60+ built-in tools grouped by capability surface). These can be composed per-chat or per-project without touching core agent logic.

---

## Key Features

### Multi-Model Support

z0 presents a unified model interface (`z0-mini`, `z0-pro`, `z0-max`) that maps transparently to provider-specific models at runtime. Supported backends include:

- **Anthropic** — Claude Sonnet 4.6 / Opus 4.6
- **Google** — Gemini 3.1 Flash / Pro
- **Kimi** — Moonshot K2.5 and extended thinking variants
- **OpenAI-compatible** — any custom endpoint via the compatible adapter

Reasoning mode is a first-class toggle — the model registry routes to a dedicated thinking-capable backend when enabled.

### MCP-Native Tool Extension

z0 implements the [Model Context Protocol](https://modelcontextprotocol.io) at the runtime layer, not as a plugin afterthought. MCP servers are registered globally, per-user, or per-chat and connect over:

- **HTTP/SSE** — remote server endpoints
- **npm stdio** — local packages spawned as child processes with configurable env and cwd

Each MCP connection is pooled with a 15-minute idle TTL, health-checked on warm-up, and reported to the agent with per-server availability status and tool counts. Tool names are namespaced by server slug to prevent collisions.

### 60+ Built-in Agent Tools

The typed Tool Catalog covers the full development lifecycle, grouped into capability surfaces:

| Group | Representative tools |
|---|---|
| Artifacts | `createArtifact`, `readArtifact`, `updateArtifact`, `listArtifacts` |
| File packages | `saveFile`, `saveMultipleFiles`, `createZip`, `listPackages` |
| Web research | `tavilySearch`, `tavilyExtract`, `tavilyCrawl`, `tavilyMap` |
| Project core | `createProject`, `listProjects`, `getProjectInfo`, `updateProjectInfo` |
| Project files | `readProjectFiles`, `createProjectFile`, `updateProjectFile`, `patchProjectFile`, `deleteProjectFile` |
| Project build | `addDependency`, `installDependencies`, `runBuild`, `runLint`, `runFormat`, `runScript` |
| Project runtime | `startDevServer`, `startPreviewServer`, `stopServer`, `proxyRequestToDevServer` |
| Browser DOM | `inspectDOM`, `queryElement`, `simulateClick`, `simulateInput`, `evaluateClientScript` |
| Browser observability | `captureScreenshot`, `getConsoleLogs`, `getNetworkRequests`, `getPerformanceMetrics` |
| Project patching | `generateDiff`, `applyDiff`, `generateASTPatch`, `searchReplace` |
| System | `runSandboxedScript`, `getQuotaUsage`, `terminateTask`, `logEvent`, `healthCheck` |

Tools are selectively exposed based on project context and user permissions. The agent receives a tool-selection policy alongside the catalog to prefer lighter tools before escalating to expensive or stateful ones.

### Skill Runtime

Skills are markdown-frontmatter documents that inject reusable operating procedures into the agent's system prompt. They can be:

- **Workspace skills** — discovered from the project filesystem
- **Configured skills** — registered per-user or per-chat in the database

The skill runtime resolves and activates them at chat time, composing a scoped system prompt section. Skills are a zero-infrastructure way to give the agent persistent, reusable domain knowledge without building a new tool.

### Project Workspace

z0 has a first-class concept of a **Project** — a persistent development environment the agent can read, write, build, run, and introspect. Projects carry:

- A managed file tree with read/write/patch operations
- A live dev server the agent can start, query, and proxy requests through
- A browser automation surface (DOM inspection, screenshots, console logs, network requests, performance metrics)
- Build and lint pipelines the agent can invoke directly
- Dependency management (add, remove, install)

### In-Browser Runtime via WebContainers

For lightweight project environments, z0 integrates `@webcontainer/api` to run Node.js workloads directly in the browser — no backend spin-up required. This enables instant project previews and iterative development without external infrastructure.

### Persistent Memory

z0 includes a user-scoped memory store. The agent builds a memory context from prior interactions and injects it into new conversations, providing continuity across sessions without requiring the user to repeat context.

### Telemetry and Usage Accounting

Every agent run is recorded as a structured `AgentRun` with:

- Token usage (prompt, completion, total)
- Credit consumption and USD cost
- Tool calls with inputs and outputs
- Run hierarchy (root, parent, child run IDs)
- Finish reason and error classification
- Model identity and reasoning flag

AI usage is also logged to an `aiUsageLog` table for per-user quota enforcement and admin reporting.

### Plugin Boundary Architecture

The agent core exposes a typed **capability boundary** that maps current built-in capabilities to planned plugin extension points. Each tool in the catalog carries a `decision` field (`keep-internal`, `refactor-internal`, `future-skill`, `future-mcp`) that tracks the migration path — giving the platform a clear contract for when and how capabilities will become externally pluggable.

### Authentication and Authorization

Authentication is built on [Better Auth](https://better-auth.dev) with GitHub OAuth. The platform supports:

- Email/password credentials
- GitHub social login
- Session management with IP and user-agent tracking
- Role-based access (`user`, `admin`)
- Account status gating
- Admin sessions and full audit logging

### Admin Surface

A dedicated admin UI backed by the Hono API provides user management, AI usage reporting, system configuration via a key-value store, audit log access, and feedback review.

---

## Architecture

z0 is a `pnpm` + `turbo` monorepo with a clean layered architecture:

```
apps/
  web/          Next.js 16 — Agent UI, auth flows, admin UI
  api/          Hono — non-agent backend API
packages/
  backend/      Domain layer: agent engine, auth, modules, DB helpers
  db/           PostgreSQL schema (Drizzle ORM), migrations, client
  shared-types/ Cross-app TypeScript contracts
  sandbox/      Mount point for the external Rust sandbox CLI
```

**Agent request flow:**
```
Chat UI → /api/chat → agent orchestrator → tool runtime → MCP / built-in tools / skills
```

**Non-agent request flow:**
```
Next.js UI → apps/web/lib/api.ts → apps/api route → backend service → repository → DB
```

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, Hono |
| Language | TypeScript (strict) |
| AI | Vercel AI SDK 6, Anthropic, Google AI, Kimi |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Better Auth |
| UI | Radix UI, Tailwind CSS, Framer Motion |
| Editor | Monaco Editor |
| Graph | React Flow (xyflow) |
| Build | Turbo, pnpm, Biome |
| Testing | Vitest |
| Runtime | Node.js ≥ 20.11.1, WebContainers |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.11.1
- pnpm 9
- PostgreSQL

### Install

```bash
git clone https://github.com/your-org/z0.git
cd z0
pnpm install
```

### Configure environment

Copy `.env.example` to `.env` in the relevant apps and fill in the required values:

```bash
# Database
DATABASE_URL=

# Auth
BETTER_AUTH_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AI providers
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
KIMI_API_KEY=
KIMI_BASE_URL=

# Sandbox CLI (optional)
SANDBOX_CLI_PATH=
SANDBOX_WORKDIR=
```

### Database setup

```bash
pnpm --filter @z0/db db:generate
pnpm --filter @z0/db db:migrate
```

### Develop

```bash
pnpm dev          # all apps in parallel
pnpm dev:web      # Next.js only
pnpm dev:api      # Hono API only
```

### Verify

```bash
pnpm test
pnpm check-types
pnpm lint
```

---

## Backend Domain Layout

```
packages/backend/src/
  agent/
    chat.ts             # Conversation orchestrator
    model.ts            # Provider registry and model map
    mcp.ts              # MCP client lifecycle and connection pooling
    skills.ts           # Skill discovery and activation
    tool-catalog.ts     # Typed tool registry (60+ tools)
    tool-bridge.ts      # Tool request/response protocol
    remote-tools.ts     # Execution bridge to web app
    prompt.ts           # System prompt construction
    plugin-boundary.ts  # Capability boundary snapshot
    telemetry.ts        # Run recording
    usage.ts            # Token and credit accounting
    persistence.ts      # Message and run persistence
  auth/                 # Better Auth server configuration
  modules/              # Domain modules: projects, users, feedback, versions, admin
```

---

## License

MIT
