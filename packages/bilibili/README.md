# @z0/bilibili

Bilibili MCP integration package for z0.

Current shape:

- npm-bootable MCP server: `z0-bilibili-mcp`
- workspace bridge to the legacy `packages/bilibili-cli` Python CLI
- dynamic skill metadata exports for z0 registration

The MCP server is started via:

```text
npm:@z0/bilibili
```

Useful environment variables:

- `Z0_BILIBILI_BIN`: explicit `bili` executable path
- `Z0_BILIBILI_SOURCE_ROOT`: override the legacy source root
- `Z0_BILIBILI_PYTHON_BIN`: override the Python interpreter for module execution

Resolution order:

1. `Z0_BILIBILI_BIN`
2. `uv run --project <legacy-root> bili`
3. `python3 -m bili_cli.cli` from `<legacy-root>`

This package currently focuses on auth + read operations and keeps Bilibili QR/browser auth inside the legacy CLI boundary.

Diagnostic MCP tool:

- `bilibili_runtime_self_check`
