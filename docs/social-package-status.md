# Social Package Status

Last updated: 2026-03-20

This document records the current shipping status of the z0 social packages after the MCP/npm consolidation work.

## Summary

These packages are now usable as self-contained z0 MCP/npm packages:

- `@z0/boss`
- `@z0/twitter`
- `@z0/bilibili`
- `@z0/xiaohongshu`

For `twitter`, `bilibili`, and `xiaohongshu`, the previous standalone Python workspace packages were removed. Their legacy Python implementations are now vendored into each package under `legacy/`.

## Package Status

### `@z0/boss`

Status: usable

- Native Rust CLI and MCP package are in place.
- npm booting is supported through the backend MCP runtime.
- Auth has multiple paths: injected cookies, saved credentials, browser-cookie import, and QR login flow.
- Read operations have native live coverage and structured fallback behavior.

Remaining boundary:

- Cross-platform browser-cookie extraction and QR auth need real desktop validation on user machines.

### `@z0/twitter`

Status: usable

- Package is self-contained and publishable.
- Native runtime and native artifact staging are in place.
- Vendored Python fallback lives in `packages/twitter/legacy/`.
- Native live coverage includes `status`, `whoami`, `user`, `feed`, `search`, `tweet`, `article`, and `user-posts`.
- MCP runtime self-check reports native binary, packaged artifacts, and legacy fallback resolution.

Remaining boundary:

- Some operations still rely on the vendored Python fallback when native auth or live requests are unavailable.

### `@z0/bilibili`

Status: usable

- Package is self-contained and publishable.
- Native runtime and native artifact staging are in place.
- Vendored Python fallback lives in `packages/bilibili/legacy/`.
- Native live coverage includes `status`, `whoami`, `video`, `search`, `hot`, `rank`, `user`, and `user-videos`.
- `user-videos` uses a native WBI signing path.

Remaining boundary:

- Live validation against real logged-in browser state still needs machine-level acceptance testing.

### `@z0/xiaohongshu`

Status: usable with a larger fallback surface

- Package is self-contained and publishable.
- Native runtime and native artifact staging are in place.
- Vendored Python fallback lives in `packages/xiaohongshu/legacy/`.
- Native live coverage is strongest for `read`, including HTML parsing and note normalization.
- MCP runtime self-check reports native binary, packaged artifacts, and legacy fallback resolution.

Remaining boundary:

- Signed API flows such as `user`, `user-posts`, `search`, `feed`, and comment-heavy operations still depend more heavily on the vendored Python fallback.

## Verification

The following checks passed during the consolidation:

- `pnpm --filter @z0/backend check-types`
- `pnpm --filter @z0/backend test -- src/agent/mcp.test.ts`
- `pnpm --filter @z0/twitter test`
- `pnpm --filter @z0/twitter lint`
- `pnpm --filter @z0/twitter check-types`
- `pnpm --filter @z0/twitter build`
- `pnpm --filter @z0/twitter release:pack`
- `pnpm --filter @z0/bilibili test`
- `pnpm --filter @z0/bilibili lint`
- `pnpm --filter @z0/bilibili check-types`
- `pnpm --filter @z0/bilibili build`
- `pnpm --filter @z0/bilibili release:pack`
- `pnpm --filter @z0/xiaohongshu test`
- `pnpm --filter @z0/xiaohongshu lint`
- `pnpm --filter @z0/xiaohongshu check-types`
- `pnpm --filter @z0/xiaohongshu build`
- `pnpm --filter @z0/xiaohongshu release:pack`

Packaging verification:

- The generated tarballs for `twitter`, `bilibili`, and `xiaohongshu` include `package/legacy/`.

## Operational Guidance

- Treat all four packages as MCP-first integrations.
- Prefer the native execution path when it is available.
- Keep the vendored Python code until native coverage materially replaces the remaining fallback surfaces.
- Do not reintroduce standalone `*-cli` workspace packages unless there is a strong packaging reason.
