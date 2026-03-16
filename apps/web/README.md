# @z0/web

Next.js frontend application for the `z0` platform.

## Scope

- app router UI
- product interaction flows
- client and server components
- Vercel deployment target

## Engineering notes

- Shared TypeScript and Biome config is owned by the monorepo root and `packages/*`.
- This app should only keep framework-specific config such as `next.config.ts`, `postcss.config.mjs`, and app-local ignore rules.
