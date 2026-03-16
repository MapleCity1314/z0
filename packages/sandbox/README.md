# @z0/sandbox

This directory is the local development mount point for the external `@z0/sandbox` Rust CLI repository.

## Repository boundary

- The real sandbox codebase is maintained in its own GitHub repository.
- The `z0` monorepo does not version the sandbox implementation.
- Only this placeholder documentation is committed here.

## Local development workflow

Clone the sandbox repository into this directory for local development:

```bash
git clone <sandbox-repository-url> packages/sandbox
```

Or, if the repository already exists elsewhere locally, place or link it here so the monorepo keeps a stable expected path.

## Why this exists

- local tooling can rely on a predictable `packages/sandbox` path
- GitHub stays clean and does not duplicate the sandbox repository
- ownership and release flow for the sandbox CLI remain independent
