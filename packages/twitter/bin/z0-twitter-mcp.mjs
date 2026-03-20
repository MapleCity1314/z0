#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveNativeBinary } from "./native-runtime.mjs";
import { executeTwitterCommand, selfCheckTwitterRuntime } from "./runtime.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TOOL_DEFINITIONS = [
  {
    name: "twitter_auth_status",
    description: "Inspect Twitter authentication state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["status", "--json"],
  },
  {
    name: "twitter_runtime_self_check",
    description: "Inspect the local Twitter CLI bridge resolution and runtime prerequisites.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    runtimeSelfCheck: true,
  },
  {
    name: "twitter_profile_me",
    description: "Read the authenticated Twitter profile.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["whoami", "--json"],
  },
  {
    name: "twitter_feed",
    description: "Read the for-you or following timeline.",
    inputSchema: {
      type: "object",
      properties: {
        timeline: { type: "string", enum: ["for-you", "following"] },
        max: { type: "number" },
      },
      additionalProperties: false,
    },
    mapArgs(input) {
      const args = ["feed"];
      if (input.timeline === "following") {
        args.push("-t", "following");
      }
      if (typeof input.max === "number") {
        args.push("--max", String(input.max));
      }
      args.push("--json");
      return args;
    },
  },
  {
    name: "twitter_bookmarks",
    description: "Read bookmarked tweets.",
    inputSchema: {
      type: "object",
      properties: { max: { type: "number" } },
      additionalProperties: false,
    },
    mapArgs(input) {
      const args = ["bookmarks"];
      if (typeof input.max === "number") {
        args.push("--max", String(input.max));
      }
      args.push("--json");
      return args;
    },
  },
  {
    name: "twitter_search",
    description: "Search tweets by keyword.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        tab: { type: "string", enum: ["Top", "Latest", "Photos", "Videos"] },
        max: { type: "number" },
      },
      required: ["query"],
      additionalProperties: false,
    },
    mapArgs(input) {
      const args = ["search", String(input.query)];
      if (input.tab) {
        args.push("-t", String(input.tab));
      }
      if (typeof input.max === "number") {
        args.push("--max", String(input.max));
      }
      args.push("--json");
      return args;
    },
  },
  {
    name: "twitter_tweet_detail",
    description: "Read one tweet or thread detail by id or URL.",
    inputSchema: {
      type: "object",
      properties: { idOrUrl: { type: "string" } },
      required: ["idOrUrl"],
      additionalProperties: false,
    },
    mapArgs(input) {
      return ["tweet", String(input.idOrUrl), "--json"];
    },
  },
  {
    name: "twitter_article",
    description: "Read one Twitter article by id or URL.",
    inputSchema: {
      type: "object",
      properties: { idOrUrl: { type: "string" } },
      required: ["idOrUrl"],
      additionalProperties: false,
    },
    mapArgs(input) {
      return ["article", String(input.idOrUrl), "--json"];
    },
  },
  {
    name: "twitter_user_lookup",
    description: "Read one Twitter user profile.",
    inputSchema: {
      type: "object",
      properties: { handle: { type: "string" } },
      required: ["handle"],
      additionalProperties: false,
    },
    mapArgs(input) {
      return ["user", String(input.handle), "--json"];
    },
  },
  {
    name: "twitter_user_posts",
    description: "Read tweets from a user timeline.",
    inputSchema: {
      type: "object",
      properties: {
        handle: { type: "string" },
        max: { type: "number" },
      },
      required: ["handle"],
      additionalProperties: false,
    },
    mapArgs(input) {
      const args = ["user-posts", String(input.handle)];
      if (typeof input.max === "number") {
        args.push("--max", String(input.max));
      }
      args.push("--json");
      return args;
    },
  },
  {
    name: "twitter_followers",
    description: "Read followers for a user.",
    inputSchema: {
      type: "object",
      properties: {
        handle: { type: "string" },
        max: { type: "number" },
      },
      required: ["handle"],
      additionalProperties: false,
    },
    mapArgs(input) {
      const args = ["followers", String(input.handle)];
      if (typeof input.max === "number") {
        args.push("--max", String(input.max));
      }
      args.push("--json");
      return args;
    },
  },
  {
    name: "twitter_following",
    description: "Read following for a user.",
    inputSchema: {
      type: "object",
      properties: {
        handle: { type: "string" },
        max: { type: "number" },
      },
      required: ["handle"],
      additionalProperties: false,
    },
    mapArgs(input) {
      const args = ["following", String(input.handle)];
      if (typeof input.max === "number") {
        args.push("--max", String(input.max));
      }
      args.push("--json");
      return args;
    },
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
  const nativeBinary = resolveNativeBinary(packageRoot);

  if (nativeBinary) {
    const nativeArgs = tool.runtimeSelfCheck ? ["runtime", "self-check"] : args;
    const result = spawnSync(nativeBinary, nativeArgs, {
      cwd: packageRoot,
      encoding: "utf8",
      env: process.env,
    });

    if (result.status !== 0) {
      return {
        error: true,
        message: (result.stderr || result.stdout || "").trim() || "Twitter native CLI execution failed",
        status: result.status ?? 1,
      };
    }

    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : String(error),
        status: 1,
      };
    }
  }

  if (tool.runtimeSelfCheck) {
    return selfCheckTwitterRuntime(packageRoot, process.env);
  }
  return executeTwitterCommand(packageRoot, args, process.env);
}

function handleRequest(message) {
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: {
          name: "@z0/twitter",
          version: "0.1.0",
        },
        capabilities: {
          tools: {},
        },
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
    error: {
      code: -32601,
      message: `Method not found: ${message.method}`,
    },
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
