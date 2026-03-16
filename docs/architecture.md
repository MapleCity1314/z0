# Architecture Notes

## Repository boundaries

- `z0` is the primary product monorepo.
- `@z0/sandbox` is a separate Rust CLI repository and is not committed into this repository.

## Sandbox integration contract

The main `z0` repository only owns:

- shared request and response types in `packages/shared-types`
- environment variable conventions for locating the CLI
- application-side integration logic

The sandbox repository owns:

- Rust implementation
- CLI entrypoint
- release and distribution strategy
- runtime isolation model

## Expected environment variables

- `SANDBOX_CLI_PATH`: absolute or resolved executable path for the sandbox CLI
- `SANDBOX_WORKDIR`: optional working directory used when invoking the sandbox CLI
