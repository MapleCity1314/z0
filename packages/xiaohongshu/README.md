# @z0/xiaohongshu

Xiaohongshu MCP integration package for z0.

Current shape:

- npm-bootable MCP server: `z0-xiaohongshu-mcp`
- native CLI shim under `native/`
- vendored legacy Python CLI under `legacy/`
- dynamic skill metadata exports for z0 registration

The MCP server is started via:

```text
npm:@z0/xiaohongshu
```

Useful environment variables:

- `Z0_XIAOHONGSHU_BIN`: explicit `xhs` executable path
- `Z0_XIAOHONGSHU_CLI_BIN`: explicit native `z0-xiaohongshu-cli` binary path
- `Z0_XIAOHONGSHU_SOURCE_ROOT`: override the vendored legacy source root
- `Z0_XIAOHONGSHU_PYTHON_BIN`: override the Python interpreter for module execution

Resolution order:

1. `Z0_XIAOHONGSHU_CLI_BIN`
2. packaged native binary under `dist/native/<platform>-<arch>/`
3. local cargo binary under `native/target/{release,debug}/`
4. `Z0_XIAOHONGSHU_BIN`
5. `uv run --project <legacy-root> xhs`
6. `python3 -m xhs_cli.cli` from the vendored `<legacy-root>`

This package now prefers a Rust native CLI shim when built. The native layer still bridges to the legacy Python CLI today, but it moves the execution boundary into a native binary so later API migration can happen behind a stable MCP surface.

Diagnostic MCP tool:

- `xiaohongshu_runtime_self_check`

Release/build notes:

- `pnpm --filter @z0/xiaohongshu build`
- `pnpm --filter @z0/xiaohongshu release:pack`
- `Z0_XIAOHONGSHU_RELEASE_TARGETS=darwin-arm64,linux-x64 pnpm --filter @z0/xiaohongshu release:matrix`
