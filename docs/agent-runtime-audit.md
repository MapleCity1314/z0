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
  - skill discovery and loading
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
- configured skills are now mounted into runtime as discoverable instruction packs through the `loadSkill` tool
- built-in backend skills now ship from `packages/backend/skills`
- MCP entries now back a real runtime warmup and pooled execution layer in `packages/backend/src/agent/mcp.ts`

This means the product currently has:

- real built-in tools
- real tool bridge execution
- real skill/MCP settings storage
- real runtime skill discovery and `loadSkill`
- real MCP client/runtime connection with warmup status and qualified tool exposure

## Core vs plugin boundary status

Roadmap plugin work is still mostly directional, but the core now has a first concrete boundary contract:

- `packages/shared-types/src/agent.ts` defines planned plugin ids, capability surfaces, plugin manifests, inventory items, and ownership records
- `packages/backend/src/agent/plugin-boundary.ts` maps the current tool catalog into a capability boundary snapshot
- `apps/api/src/routes/agent.ts` exposes `GET /v1/agent/capabilities`

This means plugin support is not implemented as a mounting/runtime system yet, but the codebase now has:

- an explicit core capability list
- a normalized planned plugin inventory
- tool-to-plugin migration targets for roadmap planning
- a stable API snapshot for UI or admin surfaces to inspect capability boundaries
- explicit snapshot metadata that says plugin installation, activation, and mounting are not available yet
- per-plugin runtime status so UI surfaces can say "planned, not mounted" instead of implying an installable market

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

### Runtime skills now enabled

Skills are now best used for:

- reusable workflow instructions
- domain-specific operating procedures
- project-local or user-local playbooks
- higher-level editing strategies that orchestrate internal tools

The runtime mechanism is:

- discover built-in skills from `packages/backend/skills`
- discover workspace skills from `.agents/skills`
- discover chat-enabled skill directories from DB
- inject skill summaries into the system prompt
- expose `loadSkill` to load full `SKILL.md` content on demand

Current built-in skills:

- `refactor-diff`
- `runtime-ui-debug`

### Future skill candidates

- `generateDiff`
- `applyDiff`
- `generateASTPatch`
- `searchReplace`

Reason:

These are workflow-shaped capabilities. They are good candidates for reusable skill packs because they represent higher-level editing strategies rather than external systems. They should likely move behind promptable editing skills that orchestrate lower-level internal tools.

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
3. configured and built-in skills now surface into runtime through discovery plus `loadSkill`

Additional optimization now implemented:

- tool catalog includes performance/cost metadata
- prompt includes explicit selection policy to prefer low-cost tools first
- editing and runtime-debug workflows are now available as first-party skills

## Next recommended phases

1. Introduce a real skill runtime
   - skills become reusable prompt/workflow packs
   - skill activation should inject structured instructions, not masquerade as tools

2. Harden and expand the MCP runtime
   - keep MCP servers executable external capability providers
   - bridge them into the catalog as a first-class source, not ad hoc DB rows
   - add stronger runtime health, retry, and observability semantics

3. Harden internal infra tools
   - replace pseudo-sandbox execution
   - move runtime health/event tooling behind dedicated services

4. Turn plugin contracts into a real plugin system
   - add manifest mounting and runtime registration
   - move planned plugin capability groups behind explicit installation/activation flows

5. Split model/provider policy from UI labels
   - keep UI model choices stable
   - move provider routing and thinking policy behind backend policy config
