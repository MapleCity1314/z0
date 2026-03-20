#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { executeBilibiliCommand, selfCheckBilibiliRuntime } from "./runtime.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TOOL_DEFINITIONS = [
  {
    name: "bilibili_auth_status",
    description: "Inspect Bilibili authentication state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["status", "--json"],
  },
  {
    name: "bilibili_runtime_self_check",
    description: "Inspect the local Bilibili CLI bridge resolution and runtime prerequisites.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    runtimeSelfCheck: true,
  },
  {
    name: "bilibili_profile_me",
    description: "Read the authenticated Bilibili profile.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["whoami", "--json"],
  },
  {
    name: "bilibili_video_detail",
    description: "Read one Bilibili video with optional extras.",
    inputSchema: {
      type: "object",
      properties: {
        idOrUrl: { type: "string" },
        subtitle: { type: "boolean" },
        comments: { type: "boolean" },
        related: { type: "boolean" },
        ai: { type: "boolean" }
      },
      required: ["idOrUrl"],
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["video", String(input.idOrUrl)];
      if (input.subtitle) args.push("--subtitle");
      if (input.comments) args.push("--comments");
      if (input.related) args.push("--related");
      if (input.ai) args.push("--ai");
      args.push("--json");
      return args;
    }
  },
  {
    name: "bilibili_user_lookup",
    description: "Read one Bilibili user by uid or name.",
    inputSchema: {
      type: "object",
      properties: { idOrName: { type: "string" } },
      required: ["idOrName"],
      additionalProperties: false
    },
    mapArgs(input) {
      return ["user", String(input.idOrName), "--json"];
    }
  },
  {
    name: "bilibili_user_videos",
    description: "Read videos from one Bilibili user.",
    inputSchema: {
      type: "object",
      properties: {
        idOrName: { type: "string" },
        max: { type: "number" }
      },
      required: ["idOrName"],
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["user-videos", String(input.idOrName)];
      if (typeof input.max === "number") args.push("--max", String(input.max));
      args.push("--json");
      return args;
    }
  },
  {
    name: "bilibili_search",
    description: "Search Bilibili users or videos.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        type: { type: "string", enum: ["user", "video"] },
        max: { type: "number" },
        page: { type: "number" }
      },
      required: ["query"],
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["search", String(input.query)];
      if (input.type) args.push("--type", String(input.type));
      if (typeof input.max === "number") args.push("--max", String(input.max));
      if (typeof input.page === "number") args.push("--page", String(input.page));
      args.push("--json");
      return args;
    }
  },
  {
    name: "bilibili_hot",
    description: "Read Bilibili hot videos.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        max: { type: "number" }
      },
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["hot"];
      if (typeof input.page === "number") args.push("--page", String(input.page));
      if (typeof input.max === "number") args.push("--max", String(input.max));
      args.push("--json");
      return args;
    }
  },
  {
    name: "bilibili_rank",
    description: "Read Bilibili ranking videos.",
    inputSchema: {
      type: "object",
      properties: {
        day: { type: "number" },
        max: { type: "number" }
      },
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["rank"];
      if (typeof input.day === "number") args.push("--day", String(input.day));
      if (typeof input.max === "number") args.push("--max", String(input.max));
      args.push("--json");
      return args;
    }
  },
  {
    name: "bilibili_feed",
    description: "Read the authenticated Bilibili feed.",
    inputSchema: {
      type: "object",
      properties: {
        offset: { type: "string" }
      },
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["feed"];
      if (input.offset) args.push("--offset", String(input.offset));
      args.push("--json");
      return args;
    }
  },
  {
    name: "bilibili_favorites",
    description: "Read favorite folders or one folder detail.",
    inputSchema: {
      type: "object",
      properties: {
        folderId: { type: "string" },
        page: { type: "number" }
      },
      additionalProperties: false
    },
    mapArgs(input) {
      const args = ["favorites"];
      if (input.folderId) args.push(String(input.folderId));
      if (typeof input.page === "number") args.push("--page", String(input.page));
      args.push("--json");
      return args;
    }
  },
  {
    name: "bilibili_following",
    description: "Read following users.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["following", "--json"],
  },
  {
    name: "bilibili_watch_later",
    description: "Read watch-later videos.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["watch-later", "--json"],
  },
  {
    name: "bilibili_history",
    description: "Read watch history.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["history", "--json"],
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
    return selfCheckBilibiliRuntime(packageRoot, process.env);
  }
  return executeBilibiliCommand(packageRoot, args, process.env);
}

function handleRequest(message) {
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "@z0/bilibili", version: "0.1.0" },
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
