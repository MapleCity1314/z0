# z0 Product Roadmap

## Purpose

This document captures the planned capability groups for `z0` beyond the current Agent runtime. It is a forward-looking product and platform roadmap, not a release changelog.

The goals behind this roadmap are:

- make `z0` a stronger high-agency Agent product
- deepen project and frontend workflows
- turn sandbox execution into a first-class Agentic dev runtime
- add vertical modules where the Agent can combine tools, skills, workflows, and decision logic

## Current Product Direction

`z0` is evolving from a chat-first coding assistant into a broader Agent platform with:

- tool-using conversation
- project-aware coding workflows
- reusable skill packs
- runtime and browser automation
- workflow orchestration
- domain-specific vertical modules

The next major phase is to make these capabilities composable and durable, so the Agent can operate across projects, workflows, research loops, and decision systems.

## Planned Capability Groups

### 1. Crypto Quant And Semi-Automated Trading

This capability group will introduce a complete crypto financial trading workspace inside `z0`.

Scope:

- full semi-automated crypto trading panel
- core exchange connectivity through OKX CLI or MCP
- strategy skill packs for different market regimes
- backtesting and win-rate analysis performed by `z0`
- real-time TradingView-driven trade decision support
- workflow automation for setup, review, and execution

Target behavior:

- `z0` can classify market context
- `z0` can run historical validation and report expected win rate, risk/reward, and failure modes
- `z0` can turn a setup into an explicit decision:
  - when `X` appears
  - and `Y` confirms
  - go long or short
  - stop loss at `A`
  - take profit at `B`
- `z0` can explain why a signal is valid or invalid

Planned building blocks:

- OKX integration layer via CLI or MCP
- TradingView signal ingestion
- market-regime skills:
  - trending market
  - range market
  - breakout market
  - mean reversion
  - volatility expansion
  - volatility compression
- backtest engine and reporting layer
- risk-control skill pack
- execution approval workflow
- workflow canvas nodes for:
  - signal intake
  - confirmation checks
  - scenario classification
  - backtest
  - decision output
  - execution handoff

Design constraints:

- keep trade execution approval-aware by default
- separate signal generation, backtesting, and order execution
- treat this as a high-risk domain with explicit guardrails and auditable logs

### 2. Workflow Canvas And Automation System

`z0` will gain a stronger workflow layer so multi-step operations become visible, reusable, and configurable.

Scope:

- workflow canvas
- node-based automation
- reusable Agent workflow templates
- event-driven and schedule-driven execution
- human approval checkpoints

Target use cases:

- trading signal workflow
- project generation workflow
- runtime debug workflow
- recruiting workflow
- research and monitoring workflow

Key ideas:

- every workflow should be inspectable
- every workflow should support retries and logs
- workflows should be able to invoke tools, skills, MCP servers, and future subagents

### 3. Better Project System

The project subsystem will be redesigned to better support real software work instead of only file-level manipulation.

Scope:

- better project model
- stronger project metadata
- clearer tool design and grouping
- improved frontend support
- improved project-to-Agent context handoff

Planned improvements:

- redesign project tools around real tasks instead of scattered primitives
- better project creation and template flows
- improved build, runtime, and inspection loops
- better patch and diff workflows
- clearer project history and state tracking
- better support for frontend iteration and verification

UI additions:

- a dedicated design section in the left sidebar
- stronger frontend-oriented tools and visual workflows
- better support for inspecting components, layouts, flows, and screenshots

### 4. Design Workspace

The left sidebar will gain a dedicated design area focused on UI, interaction, and product iteration.

Planned capabilities:

- design-oriented prompts and workflows
- frontend review and redesign skills
- screenshot-first review loops
- component ideation and layout iteration
- visual exploration tied to project files

This area should help `z0` move beyond code generation into practical design assistance for modern product building.

### 5. Subagent Customization

`z0` will add customizable subagent capability as a first-class concept.

Scope:

- user-defined subagent roles
- reusable specialist subagents
- subagent task routing
- subagent memory and workflow binding

Examples:

- frontend reviewer
- architecture planner
- quant analyst
- recruiter assistant
- resume editor
- research verifier

This should integrate with workflow canvas, skills, and project context.

### 6. GitTree Multi-Workflow Mode

A previous GitTree-style multi-workflow mode existed conceptually but was not preserved in the prior version. It is planned to return in a stronger form.

Goals:

- multiple concurrent working branches or trees
- isolated workflow tracks
- compare strategies or implementations side by side
- make long-running tasks easier to manage without context collapse

Expected fit:

- project work
- trading research
- recruiting pipelines
- multi-scenario planning

### 7. Sandbox Migration To `@z0/sandbox`

The current sandbox path is being replaced by `@z0/sandbox` as the primary execution runtime.

Planned direction:

- full sandbox replacement by `@z0/sandbox`
- stronger execution isolation
- better runtime orchestration
- cleaner CLI contract
- deeper integration with project tools and workflows

The sandbox will become a core part of the product, not just a helper for single tool calls.

Longer-term positioning:

- `z0` becomes a powerful Agentic dev sandbox
- the sandbox can support richer runtime operations
- frontend project execution and result capture become first-class capabilities

Planned examples:

- run frontend projects
- inspect live runtime
- capture screenshots of results
- evaluate whether UI changes actually worked

### 8. Agentic Dev Sandbox

Beyond simple code execution, the sandbox layer should support full agentic development loops.

Target loops:

- modify code
- install dependencies
- run dev server
- inspect runtime
- capture screenshot
- collect logs
- iterate until the result matches intent

This is a major product direction and should remain tightly aligned with project tooling, browser automation, and workflow orchestration.

### 9. Job Search Module

This is a dedicated private-use module focused on job search workflows, tailored for the user's girlfriend.

Core integration:

- BOSS直聘 CLI

Planned capabilities:

- job discovery
- job filtering and ranking
- company comparison
- posting analysis
- outreach preparation
- tracking and follow-up workflows
- resume-job matching
- application pipeline management

The module should be practical, not generic. It should optimize for repeatable job search execution and tailored decision support.

### 10. Public Opinion And Platform Intelligence

`z0` will gain a broader opinion and platform intelligence layer through CLI-based connectors.

Planned connectors:

- `xiaohongshu-cli` for notes, search, and interactions
- `bilibili-cli` for videos, users, and search
- `twitter-cli` for timelines, bookmarks, and posting
- `discord-cli` for local-first sync, search, and export
- `tg-cli` for local-first sync, search, and export
- `rdt-cli` for Reddit feed, search, posts, and interactions

This capability group is intended to support:

- trend tracking
- sentiment monitoring
- creator and topic research
- community intelligence
- content discovery
- cross-platform evidence synthesis

### 11. z0 Super Search Engine

Several of the research and platform capabilities above will converge into a larger search product inside `z0`.

Direction:

- an integrated AI search engine built on top of multiple data sources
- cross-platform retrieval and synthesis
- better ranking of useful information instead of simple aggregation
- strong source comparison and contradiction detection

Target behavior:

- `z0` searches across multiple channels
- `z0` compares conflicting claims
- `z0` surfaces the most actionable result set
- `z0` explains uncertainty rather than pretending certainty

### 12. Truthfulness And Core Reasoning

As `z0` gains more web-connected intelligence, a core requirement is improved truth discrimination.

The Agent should:

- distinguish reliable from weak sources
- compare conflicting online claims
- identify likely misinformation
- explain confidence and uncertainty
- produce the most useful recommendation, not just the most popular one

This reasoning layer is critical for:

- finance
- recruiting
- platform intelligence
- product research
- automated decision workflows

### 13. Resume System And Resume Design Skills

`z0` will include a dedicated resume capability group.

Planned direction:

- resume-focused standard skill pack
- structured resume authoring workflows
- role-specific adaptation
- style and layout recommendations
- stronger resume review and iteration loops

Target use cases:

- convert raw experience into a clean resume
- tailor a resume for a role
- improve clarity and impact
- generate variants for different application tracks
- connect resume edits with job matching workflows

## Cross-Cutting Product Principles

These planned features should follow the same core principles:

- separate raw tool access from workflow-level intelligence
- use skills for reusable expert operating procedures
- use MCP and CLI integrations as capability backends, not UI-only add-ons
- keep risky domains approval-aware and auditable
- prefer explainable decisions over opaque automation
- keep project, workflow, and runtime state explicit

## Expected Integration Map

Many roadmap items are intentionally connected:

- trading uses skills, workflows, search, reasoning, and external connectors
- project improvements depend on sandbox, runtime tools, and design workflows
- recruiting depends on search, resume skills, and workflow orchestration
- super search depends on cross-platform connectors and truth-evaluation logic
- subagents should plug into all major capability groups

## Notes

- This roadmap includes future product groups that are not yet implemented.
- Inclusion here means intentional direction, not immediate availability.
- As these areas become concrete, they should be broken into architecture docs, implementation plans, and capability-specific specs.
