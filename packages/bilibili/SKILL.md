---
name: z0-bilibili
description: Use Bilibili MCP tools for auth checks, profile reads, video detail, search, hot/rank, feed, and collections in z0.
---

# @z0/bilibili

Use the MCP tools instead of direct shell commands.

Auth flow:

1. Call `bilibili_auth_status`.
2. If auth is missing, ask the user to complete `bili login` or make browser cookies available.
3. Retry `bilibili_auth_status` before protected tools.
