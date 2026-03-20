# @z0/ui

Shared UI primitives for `z0`.

This package assumes the host app provides the design tokens consumed by the
class names here, especially:

- `--background`
- `--foreground`
- `--border`
- `--radius`
- `--popover`
- `--popover-foreground`
- `--card`
- `--card-foreground`

The current host is `apps/web`, which defines these tokens in
`app/globals.css`.
