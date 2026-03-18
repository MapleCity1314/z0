# z0 Product Roadmap

## Purpose

This document captures the planned capability groups for `z0` beyond the current Agent runtime. It is a forward-looking product and platform roadmap, not a release changelog.

The goals behind this roadmap are:

- define a stable, extensible `z0` core that can power any Agent workflow
- expose a clean plugin system so large capability groups can be installed independently
- keep the core runtime lean and composable while plugins handle vertical domains
- make the overall platform coherent rather than a collection of disconnected features

---

## Architecture Overview

`z0` is organized into two distinct layers:

### z0 Core

The core is the foundation. It is always present and provides everything the Agent needs to reason, act, and extend itself.

Core includes:

- **conversation engine** — chat interface, context management, and session state
- **chat UI** — the primary interaction surface
- **tool system** — structured tool definitions, routing, and result handling
- **MCP adapter** — connects any MCP server as a tool backend
- **skill loader** — registers and executes reusable skill packs

The core does not include any vertical domain logic. It is domain-agnostic by design.

### z0 Plugin System

Plugins are self-contained capability bundles installed alongside the core. Each plugin delivers a complete vertical experience — its own tools, skills, MCP integrations, UI panels, and workflow logic.

Plugins are registered statically at startup via configuration. Once registered, they extend the core's tool system, skill loader, and UI surface without modifying core internals.

Plugin contract:

- a plugin declares its tools, skills, and MCP dependencies in a manifest
- the core mounts the plugin at startup and exposes its capabilities to the Agent
- plugins do not communicate with each other directly; they interact through the core

---

## Planned Plugins

### Plugin: Crypto Quant and Semi-Automated Trading (`@z0/plugin-trading`)

A complete crypto trading workspace delivered as a plugin.

Included capabilities:

- full semi-automated trading panel
- OKX integration via CLI or MCP
- strategy skill packs for trending, range, breakout, mean reversion, and volatility regimes
- backtesting and win-rate analysis
- TradingView signal ingestion and decision support
- execution approval workflow with explicit guardrails and auditable logs

Target Agent behavior:

- classify market context and regime
- run historical validation and report expected win rate, risk/reward, and failure modes
- convert a setup into an explicit decision: entry condition, confirmation, direction, stop loss, take profit
- explain why a signal is valid or invalid

Design constraints:

- trade execution is always approval-aware
- signal generation, backtesting, and order execution are separated
- all decisions are logged and auditable

---

### Plugin: Project and Agentic Dev Sandbox (`@z0/plugin-project`)

A full project management and agentic development environment delivered as a plugin.

Included capabilities:

- redesigned project model with stronger metadata and clearer tool grouping
- project creation, template flows, and history tracking
- build, runtime, and inspection loops
- patch and diff workflows
- frontend iteration and verification support
- agentic dev sandbox supporting the full modify → install → run → inspect → screenshot → iterate loop
- browser automation and live runtime inspection
- design workspace with screenshot-first review, component ideation, and layout iteration

Target Agent behavior:

- manage project state across sessions
- run frontend projects and capture visual results
- evaluate whether UI changes actually worked
- iterate until output matches intent

---

### Plugin: Super Search and Platform Intelligence (`@z0/plugin-search`)

A cross-platform research and intelligence layer delivered as a plugin.

Included capabilities:

- integrated AI search across multiple data sources
- CLI connectors: `xiaohongshu-cli`, `bilibili-cli`, `twitter-cli`, `discord-cli`, `tg-cli`, `rdt-cli`
- cross-platform retrieval and synthesis
- source comparison and contradiction detection
- truthfulness evaluation: distinguish reliable from weak sources, identify likely misinformation, explain confidence and uncertainty

Target Agent behavior:

- search across multiple channels simultaneously
- compare conflicting claims and surface the most actionable result set
- explain uncertainty rather than asserting false certainty
- support finance, recruiting, product research, and automated decision workflows

---

### Plugin: Resume and Job Search (`@z0/plugin-resume`)

A dedicated resume authoring and job search workflow plugin.

Included capabilities:

- resume skill pack: structured authoring, role-specific adaptation, style and layout recommendations, review and iteration loops
- BOSS直聘 CLI integration
- job discovery, filtering, ranking, and company comparison
- outreach preparation and application pipeline tracking
- resume-to-job matching

Target Agent behavior:

- convert raw experience into a clean, targeted resume
- generate variants for different application tracks
- connect resume edits with job matching workflows
- manage the full application pipeline from discovery to follow-up

---

### Plugin: Workflow Canvas (`@z0/plugin-workflow`)

A visual workflow orchestration layer delivered as a plugin.

Included capabilities:

- node-based workflow canvas
- reusable Agent workflow templates
- event-driven and schedule-driven execution
- human approval checkpoints
- retry handling and execution logs

Example workflows:

- trading signal workflow
- project generation and validation workflow
- recruiting and outreach pipeline
- research and monitoring loop

Design constraint: every workflow must be inspectable, retryable, and auditable.

---

### Plugin: Subagent Customization (`@z0/plugin-subagents`)

User-defined specialist subagents as a first-class plugin concept.

Included capabilities:

- user-defined subagent roles and skill bindings
- subagent task routing from the core Agent
- subagent memory scoping
- integration with workflow canvas and project context

Example subagent roles:

- frontend reviewer
- architecture planner
- quant analyst
- recruiter assistant
- research verifier

---

### Plugin: GitTree Multi-Workflow Mode (`@z0/plugin-gittree`)

Concurrent working branches and isolated workflow tracks delivered as a plugin.

Included capabilities:

- multiple concurrent workflow tracks per session
- side-by-side strategy and implementation comparison
- long-running task management without context collapse

Target use cases:

- multi-branch project work
- parallel trading research
- multi-scenario planning

---

## Cross-Cutting Principles

All plugins and the core follow the same design principles:

- separate raw tool access from workflow-level intelligence
- use skills for reusable expert operating procedures
- use MCP and CLI integrations as capability backends, not UI-only add-ons
- keep risky domains approval-aware and auditable
- prefer explainable decisions over opaque automation
- keep project, workflow, and runtime state explicit

---

## Integration Map

Plugins are intentionally composable through the core:

- `plugin-trading` uses skills from the skill loader, workflows from `plugin-workflow`, and search from `plugin-search`
- `plugin-project` depends on the sandbox runtime exposed through core tooling
- `plugin-resume` connects with `plugin-search` for job discovery and `plugin-workflow` for pipeline management
- `plugin-search` powers truthfulness evaluation across trading, recruiting, and product research
- `plugin-subagents` plugs into any capability group that needs specialist routing
- `plugin-gittree` provides isolation primitives that any plugin can use for concurrent work

---

## Notes

- This roadmap describes planned capability groups, not released features.
- Inclusion here means intentional direction, not immediate availability.
- As plugins become concrete, each should have its own architecture doc, implementation plan, and capability spec.
- The plugin system interface is not yet finalized; the manifest contract and core mounting API will be defined during the core refactor.