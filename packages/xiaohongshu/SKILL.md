---
name: z0-xiaohongshu
description: Use Xiaohongshu MCP tools for auth checks, search, note reads, comments, feed, hot, user, favorites, and notifications in z0.
---

# @z0/xiaohongshu

Use the MCP tools instead of direct shell commands.

Auth flow:

1. Call `xiaohongshu_auth_status`.
2. If auth is missing, ask the user to complete `xhs login` or `xhs login --qrcode`.
3. Retry `xiaohongshu_auth_status` before protected tools.
