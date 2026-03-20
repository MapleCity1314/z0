---
name: boss
description: Use the Boss MCP integration for BOSS 直聘 auth, profile, job search, recommendations, and recruiter inbox reads.
---

# Boss

Use this skill when the user asks to browse or inspect BOSS 直聘 data inside z0.

## Working Rules

1. Always call `boss_auth_status` first before any authenticated operation.
2. If the user is not authenticated, try `boss_auth_login_browser` before `boss_auth_login_qr`.
3. Prefer explicit IDs from tool outputs.
4. Use `boss_jobs_search` to discover positions, then `boss_jobs_detail` with `securityId`.
5. Do not assume write actions exist. This baseline only supports auth and read flows.
