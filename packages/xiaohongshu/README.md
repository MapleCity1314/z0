# @z0/xiaohongshu

Xiaohongshu MCP integration package for z0.

Current shape:

- npm-bootable MCP server: `z0-xiaohongshu-mcp`
- workspace bridge to the legacy `packages/xiaohongshu-cli` Python CLI
- dynamic skill metadata exports for z0 registration

The MCP server is started via:

```text
npm:@z0/xiaohongshu
```

Useful environment variables:

- `Z0_XIAOHONGSHU_BIN`: explicit `xhs` executable path
- `Z0_XIAOHONGSHU_SOURCE_ROOT`: override the legacy source root
- `Z0_XIAOHONGSHU_PYTHON_BIN`: override the Python interpreter for module execution

Resolution order:

1. `Z0_XIAOHONGSHU_BIN`
2. `uv run --project <legacy-root> xhs`
3. `python3 -m xhs_cli.cli` from `<legacy-root>`

This package currently focuses on auth + read operations and keeps browser-cookie and QR-login logic inside the legacy CLI boundary.

Diagnostic MCP tool:

- `xiaohongshu_runtime_self_check`
