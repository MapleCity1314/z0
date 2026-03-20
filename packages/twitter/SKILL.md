---
name: z0-twitter
description: Use Twitter/X MCP tools for auth checks, feeds, search, tweet detail, and user reads in z0.
---

# @z0/twitter

Use the MCP tools instead of shelling out directly.

Auth flow:

1. Call `twitter_auth_status`.
2. If auth is missing, ask the user to log into X in a local browser that `twitter-cli` can read.
3. Retry `twitter_auth_status` before other tools.
