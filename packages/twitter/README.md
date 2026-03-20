# @z0/twitter

Twitter/X MCP integration package for z0.

Current shape:

- npm-bootable MCP server: `z0-twitter-mcp`
- workspace bridge to the legacy `packages/twitter-cli` Python CLI
- dynamic skill metadata exports for z0 registration

The MCP server is started via npm package booting using:

```text
npm:@z0/twitter
```

Useful environment variables:

- `Z0_TWITTER_BIN`: explicit `twitter` executable path
- `Z0_TWITTER_SOURCE_ROOT`: override the legacy source root
- `Z0_TWITTER_PYTHON_BIN`: override the Python interpreter for module execution

Resolution order:

1. `Z0_TWITTER_BIN`
2. `uv run --project <legacy-root> twitter`
3. `python3 -m twitter_cli.cli` from `<legacy-root>`

This package currently focuses on auth + read operations. It is workspace-stable, but it is not yet a self-contained publishable runtime because execution still depends on the legacy Python CLI environment.

Diagnostic MCP tool:

- `twitter_runtime_self_check`
