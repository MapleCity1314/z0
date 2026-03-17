# Agent Runtime Audit

Last updated: 2026-03-17

## Current runtime shape

Current execution path:

`browser -> apps/web /api/chat -> apps/api /v1/agent/chat -> packages/backend orchestration -> apps/web tool bridge`

Current boundaries:

- `apps/web`
  - chat UI
  - attachment preprocessing
  - auth/session consumption
  - tool execution bridge
  - skills/MCP settings UI and DB wiring
- `apps/api`
  - authenticated HTTP boundary for agent chat
- `packages/backend`
  - request validation
  - model selection
  - prompt construction
  - tool catalog
  - orchestration
  - telemetry persistence

## Actual model configuration

Current user-selectable models:

- `z0-mini`
  - standard: `kimi:k2.5`
  - reasoning: `kimi:thinking`
- `z0-pro`
  - standard: `claude:sonnet46`
  - reasoning: `claude:opus46`
- `z0-max`
  - standard: `claude:sonnet46`
  - reasoning: `claude:opus46`

Current orchestration defaults from code:

- transport: `streamText`
- tool choice: `auto`
- max tool loop: `stepCountIs(20)`
- temperature: `0.7`
- reasoning provider options:
  - only enabled for `z0-pro` and `z0-max`
  - current budget: `12000`
- streamed extras:
  - reasoning: enabled
  - sources: enabled

## Actual tool inventory

Source of truth now lives in `packages/backend/src/agent/tool-catalog.ts`.

Current totals:

- total tools: `61`
- always-available base tools: `17`
- web-search-only tools: `4`
- project-context tools: `40`

Decision split:

- keep internal: `33`
- refactor internal: `6`
- future skill candidates: `4`
- future MCP candidates: `18`

## Skills and MCP actual status

Current state is important:

- `Skill`, `UserSkill`, `ChatSkill` are persisted and exposed in UI
- `MCPServer`, `UserMCPServer`, `ChatMCPServer` are persisted and exposed in UI
- neither skills nor MCP entries are currently mounted into the runtime as executable agent capabilities
- today they are configuration records, not runtime capability providers

This means the product currently has:

- real built-in tools
- real tool bridge execution
- real skill/MCP settings storage
- no actual runtime skill engine
- no actual runtime MCP client/session layer

## Decisions

### Keep as internal tools

These are product-specific, tightly coupled to chat/project state, or need first-party auth and DB access:

- artifact tools
- file package tools
- project CRUD and project file tools
- project build/runtime tools
- quota/task controls

Reason:

They operate on first-party data and product-specific runtime state. Turning them into MCP now would add protocol complexity without reducing maintenance cost.

### Refactor but keep internal

- `runSandboxedScript`
- `healthCheck`
- `logEvent`
- `queryEvents`
- `checkProjectWorkspaceHealth`
- `proxyRequestToDevServer`

Reason:

These belong to infrastructure/runtime services, but still fit better as internal capabilities than as skills or MCP. The right change is service hardening and cleaner boundaries, not a protocol switch.

### Future skill candidates

- `generateDiff`
- `applyDiff`
- `generateASTPatch`
- `searchReplace`

Reason:

These are workflow-shaped capabilities. They are good candidates for reusable skill packs because they represent higher-level editing strategies rather than external systems. They should likely become structured "editing skills" that orchestrate lower-level internal tools.

### Future MCP candidates

- Tavily web tools
- DOM/browser interaction tools
- browser observability tools

Reason:

These capabilities already look like external capability providers or browser-automation providers. They benefit from a protocol boundary and are natural fits for MCP once a stable MCP client/runtime is added.

## Immediate refactor outcomes implemented now

This audit drove three concrete changes:

1. tool inventory is now single-sourced in backend
2. system prompt is now generated from the actual enabled tool catalog instead of a stale handwritten block
3. runtime prompt now explicitly states that configured skills/MCP are not available unless surfaced as tools

## Next recommended phases

1. Introduce a real skill runtime
   - skills become reusable prompt/workflow packs
   - skill activation should inject structured instructions, not masquerade as tools

2. Introduce a real MCP runtime
   - MCP servers become executable external capability providers
   - bridge them into the catalog as a separate source, not ad hoc DB rows

3. Harden internal infra tools
   - replace pseudo-sandbox execution
   - move runtime health/event tooling behind dedicated services

4. Split model/provider policy from UI labels
   - keep UI model choices stable
   - move provider routing and thinking policy behind backend policy config
