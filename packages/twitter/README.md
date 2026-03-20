# @z0/twitter

Twitter/X MCP integration package for z0.

Current shape:

- npm-bootable MCP server: `z0-twitter-mcp`
- native CLI shim under `native/`
- vendored legacy Python CLI under `legacy/`
- dynamic skill metadata exports for z0 registration

The MCP server is started via npm package booting using:

```text
npm:@z0/twitter
```

Useful environment variables:

- `Z0_TWITTER_BIN`: explicit `twitter` executable path
- `Z0_TWITTER_CLI_BIN`: explicit native `z0-twitter-cli` binary path
- `Z0_TWITTER_SOURCE_ROOT`: override the vendored legacy source root
- `Z0_TWITTER_PYTHON_BIN`: override the Python interpreter for module execution

Resolution order:

1. `Z0_TWITTER_CLI_BIN`
2. packaged native binary under `dist/native/<platform>-<arch>/`
3. local cargo binary under `native/target/{release,debug}/`
4. `Z0_TWITTER_BIN`
5. `uv run --project <legacy-root> twitter`
6. `python3 -m twitter_cli.cli` from the vendored `<legacy-root>`

This package now prefers a Rust native CLI shim when built. The native layer still bridges to the legacy Python CLI today, but it moves the execution boundary into a native binary so later API migration can happen behind a stable MCP surface.

Diagnostic MCP tool:

- `twitter_runtime_self_check`

Release/build notes:

- `pnpm --filter @z0/twitter build`
- `pnpm --filter @z0/twitter release:pack`
- `Z0_TWITTER_RELEASE_TARGETS=darwin-arm64,linux-x64 pnpm --filter @z0/twitter release:matrix`
