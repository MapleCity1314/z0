# @z0/boss

Boss MCP integration package for z0.

Current shape:

- npm-bootable MCP server: `z0-boss-mcp`
- Rust CLI backend under `native/`
- prebuilt native artifact staging under `dist/native/`
- explicit metadata exports for dynamic integration registration

Supported baseline capabilities:

- auth status / login / logout
- auth self-check / diagnostics
- profile read
- job search / recommend / detail / history / applied / interviews
- recruiter chat list

The MCP server is started via npm package booting using the endpoint format:

```text
npm:@z0/boss
```

Optional query parameters:

- `args`: repeatable extra args passed to `npm exec`
- `cwd`: working directory
- `env.NAME=value`: environment variables

## Build And Release

`@z0/boss` now prefers a staged native binary instead of `cargo run` at MCP call time.

Useful scripts:

- `pnpm --filter @z0/boss build`: emit `dist/index.js` and stage a release native binary into `dist/native/<platform>-<arch>/`
- `pnpm --filter @z0/boss build:native:target -- <triple>`: build and stage one explicit Rust target
- `pnpm --filter @z0/boss prepack`: build everything before packaging
- `pnpm --filter @z0/boss release:pack`: produce a tarball in `packages/boss/artifacts/`
- `pnpm --filter @z0/boss release:matrix`: stage multiple target artifacts listed in `Z0_BOSS_RELEASE_TARGETS`

Runtime binary resolution order:

1. `Z0_BOSS_CLI_BIN`
2. staged `dist/native/<platform>-<arch>/z0-boss-cli`
3. local `native/target/release/z0-boss-cli`
4. local `native/target/debug/z0-boss-cli`

This keeps workspace development convenient while making packaged npm booting deterministic.

Example multi-platform release staging:

```bash
Z0_BOSS_RELEASE_TARGETS=darwin-arm64,linux-x64,win32-x64 pnpm --filter @z0/boss release:matrix
```

## Runtime Modes

`@z0/boss` currently runs in two layers:

- preferred: legacy live bridge via local `packages/boss-cli`
- fallback: built-in Rust fixture backend

The live bridge is attempted automatically for high-value read commands if the
legacy source tree exists and a Python runtime can execute it.

Useful environment variables:

- `Z0_WORKSPACE_ROOT`: override workspace root detection
- `Z0_BOSS_LEGACY_BIN`: override the Python executable used for the legacy bridge
- `Z0_BOSS_CREDENTIAL_DIR`: override credential storage directory
- `BOSS_COOKIES`: injected browser-style cookie header for Rust auth bootstrap
- `BOSS_COOKIE_FILE`: file-based cookie injection
- `BOSS_COOKIES_JSON`: JSON cookie export string
- `BOSS_COOKIES_JSON_FILE`: JSON cookie export file
- `BOSS_NETSCAPE_COOKIE_FILE`: Netscape cookie export file
- `BOSS_ZP_STOKEN`: optional `__zp_stoken__` supplement
- `BOSS_QR_COOKIES`: QR-login cookie injection for the baseline flow

Current auth priority for `boss_auth_login_browser`:

1. `BOSS_COOKIES`
2. `BOSS_COOKIE_FILE`
3. `BOSS_COOKIES_JSON`
4. `BOSS_COOKIES_JSON_FILE`
5. `BOSS_NETSCAPE_COOKIE_FILE`
6. legacy `~/.config/boss-cli/credential.json`

`boss_auth_login_qr` now attempts a native Rust QR flow before falling back to injected cookies.

## Auth Diagnostics

Two auth-oriented MCP tools are available:

- `boss_auth_status`: lightweight health summary for the currently stored credential
- `boss_auth_self_check`: fuller local diagnostic covering runtime, env hints, browser probing, stored credential shape, and live endpoint health

`boss_auth_status` now reports:

- `cookieCount`
- `cookieNames`
- `hasZpStoken`
- `profileAuthenticated`
- `searchAuthenticated`
- `recommendAuthenticated`
- `healthWarnings`
