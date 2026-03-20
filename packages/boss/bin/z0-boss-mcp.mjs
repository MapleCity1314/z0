#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveNativeBinary } from "./native-runtime.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TOOL_DEFINITIONS = [
  {
    name: "boss_auth_status",
    description: "Inspect stored Boss authentication state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["auth", "status"],
  },
  {
    name: "boss_auth_self_check",
    description: "Run a local Boss auth diagnostic for browser cookies, stored credentials, and live health.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["auth", "self-check"],
  },
  {
    name: "boss_auth_login_browser",
    description: "Load Boss auth from browser-like local sources or injected cookies.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["auth", "login-browser"],
  },
  {
    name: "boss_auth_login_qr",
    description: "Start the Boss QR fallback flow.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["auth", "login-qr"],
  },
  {
    name: "boss_auth_logout",
    description: "Clear stored Boss auth state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["auth", "logout"],
  },
  {
    name: "boss_profile_me",
    description: "Read the authenticated Boss profile.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["profile", "me"],
  },
  {
    name: "boss_jobs_search",
    description: "Search Boss jobs by keyword.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
      additionalProperties: false,
    },
    mapArgs(input) {
      return ["jobs", "search", String(input.query)];
    },
  },
  {
    name: "boss_jobs_recommend",
    description: "List recommended Boss jobs.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["jobs", "recommend"],
  },
  {
    name: "boss_jobs_detail",
    description: "Read one Boss job detail by securityId.",
    inputSchema: {
      type: "object",
      properties: {
        securityId: { type: "string" },
      },
      required: ["securityId"],
      additionalProperties: false,
    },
    mapArgs(input) {
      return ["jobs", "detail", String(input.securityId)];
    },
  },
  {
    name: "boss_jobs_history",
    description: "Read Boss browsing history.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["jobs", "history"],
  },
  {
    name: "boss_jobs_applied",
    description: "Read Boss applied jobs.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["jobs", "applied"],
  },
  {
    name: "boss_jobs_interviews",
    description: "Read Boss interview invitations.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["jobs", "interviews"],
  },
  {
    name: "boss_social_chat_list",
    description: "Read recruiter chat list.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["social", "chat-list"],
  },
  {
    name: "boss_meta_cities",
    description: "List supported Boss cities.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: ["meta", "cities"],
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
  let binaryPath;

  try {
    binaryPath = resolveNativeBinary(packageRoot, process.env);
  } catch (error) {
    return {
      error: true,
      message: error instanceof Error ? error.message : String(error),
      status: 1,
    };
  }

  const result = spawnSync(binaryPath, args, {
    cwd: packageRoot,
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").trim() || "Boss CLI execution failed";
    return {
      error: true,
      message,
      status: result.status ?? 1,
    };
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Failed to parse Boss CLI JSON output: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function handleRequest(message) {
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: {
          name: "@z0/boss",
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
        content: [
          {
            type: "text",
            text: JSON.stringify(payload),
          },
        ],
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
