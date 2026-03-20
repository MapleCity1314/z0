#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  executeXiaohongshuCommand,
  selfCheckXiaohongshuRuntime,
} from "./runtime.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TOOL_DEFINITIONS = [
  {
    name: "xiaohongshu_auth_status",
    description: "Inspect Xiaohongshu authentication state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["status", "--json"],
  },
  {
    name: "xiaohongshu_runtime_self_check",
    description: "Inspect the local Xiaohongshu CLI bridge resolution and runtime prerequisites.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    runtimeSelfCheck: true,
  },
  {
    name: "xiaohongshu_profile_me",
    description: "Read the authenticated Xiaohongshu profile.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["whoami", "--json"],
  },
  {
    name: "xiaohongshu_search",
    description: "Search Xiaohongshu notes.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        sort: { type: "string", enum: ["general", "popular", "latest"] },
        type: { type: "string", enum: ["all", "video", "image"] },
        page: { type: "number" }
      },
      required: ["query"],
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["search", String(input.query)];
      if (input.sort) args.push("--sort", String(input.sort));
      if (input.type) args.push("--type", String(input.type));
      if (typeof input.page === "number") args.push("--page", String(input.page));
      args.push("--json");
      return args;
    }
  },
  {
    name: "xiaohongshu_note_detail",
    description: "Read one Xiaohongshu note by id, url, or short index.",
    inputSchema: {
      type: "object",
      properties: { idOrUrlOrIndex: { type: "string" } },
      required: ["idOrUrlOrIndex"],
      additionalProperties: false
    },
    mapArgs(input) {
      return ["read", String(input.idOrUrlOrIndex), "--json"];
    }
  },
  {
    name: "xiaohongshu_comments",
    description: "Read comments for one note.",
    inputSchema: {
      type: "object",
      properties: {
        idOrUrlOrIndex: { type: "string" },
        all: { type: "boolean" }
      },
      required: ["idOrUrlOrIndex"],
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["comments", String(input.idOrUrlOrIndex)];
      if (input.all) args.push("--all");
      args.push("--json");
      return args;
    }
  },
  {
    name: "xiaohongshu_user_lookup",
    description: "Read one Xiaohongshu user.",
    inputSchema: {
      type: "object",
      properties: { userId: { type: "string" } },
      required: ["userId"],
      additionalProperties: false
    },
    mapArgs(input) {
      return ["user", String(input.userId), "--json"];
    }
  },
  {
    name: "xiaohongshu_user_posts",
    description: "Read posts from one Xiaohongshu user.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        cursor: { type: "string" }
      },
      required: ["userId"],
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["user-posts", String(input.userId)];
      if (input.cursor) args.push("--cursor", String(input.cursor));
      args.push("--json");
      return args;
    }
  },
  {
    name: "xiaohongshu_feed",
    description: "Read the recommendation feed.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["feed", "--json"],
  },
  {
    name: "xiaohongshu_hot",
    description: "Read hot notes by category.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string" }
      },
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["hot"];
      if (input.category) args.push("-c", String(input.category));
      args.push("--json");
      return args;
    }
  },
  {
    name: "xiaohongshu_topics",
    description: "Search Xiaohongshu topics.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false
    },
    mapArgs(input) {
      return ["topics", String(input.query), "--json"];
    }
  },
  {
    name: "xiaohongshu_search_user",
    description: "Search Xiaohongshu users.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false
    },
    mapArgs(input) {
      return ["search-user", String(input.query), "--json"];
    }
  },
  {
    name: "xiaohongshu_favorites",
    description: "Read favorites for self or another user.",
    inputSchema: {
      type: "object",
      properties: { userId: { type: "string" } },
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["favorites"];
      if (input.userId) args.push(String(input.userId));
      args.push("--json");
      return args;
    }
  },
  {
    name: "xiaohongshu_my_notes",
    description: "Read your own posted notes.",
    inputSchema: {
      type: "object",
      properties: { page: { type: "number" } },
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["my-notes"];
      if (typeof input.page === "number") args.push("--page", String(input.page));
      args.push("--json");
      return args;
    }
  },
  {
    name: "xiaohongshu_unread",
    description: "Read unread counts.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["unread", "--json"],
  },
  {
    name: "xiaohongshu_notifications",
    description: "Read notifications.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["mentions", "likes", "connections"] }
      },
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["notifications"];
      if (input.type) args.push("--type", String(input.type));
      args.push("--json");
      return args;
    }
  },
];

const toolByName = new Map(TOOL_DEFINITIONS.map((tool) => [tool.name, tool]));

function writeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
  process.stdout.write(body);
}

function executeTool(toolName, input) {
  const tool = toolByName.get(toolName);

  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const args = tool.mapArgs ? tool.mapArgs(input ?? {}) : tool.args;
  if (tool.runtimeSelfCheck) {
    return selfCheckXiaohongshuRuntime(packageRoot, process.env);
  }
  return executeXiaohongshuCommand(packageRoot, args, process.env);
}

function handleRequest(message) {
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "@z0/xiaohongshu", version: "0.1.0" },
        capabilities: { tools: {} },
      },
    };
  }

  if (message.method === "notifications/initialized") {
    return null;
  }

  if (message.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        tools: TOOL_DEFINITIONS.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        })),
      },
    };
  }

  if (message.method === "tools/call") {
    const payload = executeTool(message.params?.name, message.params?.arguments);
    const isError = payload && typeof payload === "object" && payload.error === true;

    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload,
        isError,
      },
    };
  }

  return {
    jsonrpc: "2.0",
    id: message.id ?? null,
    error: { code: -32601, message: `Method not found: ${message.method}` },
  };
}

let buffer = Buffer.alloc(0);

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);

  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");

    if (headerEnd === -1) {
      return;
    }

    const headerText = buffer.slice(0, headerEnd).toString("utf8");
    const match = headerText.match(/Content-Length:\s*(\d+)/i);

    if (!match) {
      throw new Error("Missing Content-Length header");
    }

    const contentLength = Number(match[1]);
    const bodyStart = headerEnd + 4;

    if (buffer.length < bodyStart + contentLength) {
      return;
    }

    const body = buffer.slice(bodyStart, bodyStart + contentLength).toString("utf8");
    buffer = buffer.slice(bodyStart + contentLength);

    const message = JSON.parse(body);
    const response = handleRequest(message);

    if (response) {
      writeMessage(response);
    }
  }
});
