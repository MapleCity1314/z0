# z0

`z0` is a `pnpm` + `turbo` monorepo for a Vercel-first product architecture.

## Workspace layout

```text
apps/
  web/          Next.js application
  api/          Hono API service for future Vercel deployment
packages/
  config-biome/ Unified Biome JSON configs
  typescript-config/ Shared TypeScript presets
  shared-types/ Cross-app type contracts
  sandbox/      Local mount point for the external sandbox CLI repository
```

## Engineering conventions

- Package manager: `pnpm`
- Task runner: `turbo`
- Lint / format: `Biome`
- Type system: `TypeScript`
- Deployment target: `Vercel`
- Backend direction: `Hono` + `Supabase`

## Commands

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm lint
pnpm format
pnpm check-types
pnpm build
```

## Standards

- Root-level config owns shared engineering defaults.
- `apps/web` keeps product code and only retains app-specific config.
- `apps/api` is the Vercel-facing Hono service layer.
- `packages/shared-types` holds TypeScript contracts shared by web and api.
- `@z0/sandbox` is an external Rust CLI project maintained in its own repository.
- `packages/sandbox` is reserved as the local mount point for that external repository, but only the placeholder docs are committed here.
