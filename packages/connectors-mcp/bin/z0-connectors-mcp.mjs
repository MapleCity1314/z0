#!/usr/bin/env node

const CONNECTOR_KIND = process.argv[2] || process.env.Z0_CONNECTOR_KIND || "unknown";
const ACCESS_TOKEN = process.env.Z0_CONNECTOR_ACCESS_TOKEN || "";

function writeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
  process.stdout.write(body);
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = null;

  try {
    payload = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}: ${
        typeof payload === "string" ? payload : JSON.stringify(payload)
      }`,
    );
  }

  return payload;
}

function requireToken() {
  if (!ACCESS_TOKEN) {
    throw new Error(`Missing Z0_CONNECTOR_ACCESS_TOKEN for ${CONNECTOR_KIND}`);
  }
}

function createTitleElement(title) {
  return {
    id: "title",
    type: "text",
    x: 80,
    y: 100,
    width: 480,
    height: 48,
    angle: 0,
    strokeColor: "#111827",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: 1,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    text: title,
    fontSize: 32,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
    baseline: 32,
    containerId: null,
    originalText: title,
    lineHeight: 1.25,
  };
}

function normalizeExcalidrawScene(input) {
  if (input.scene && typeof input.scene === "object") {
    return {
      ...input.scene,
      type: "excalidraw/scene",
      version:
        typeof input.scene.version === "number" ? input.scene.version : 1,
      appState: {
        viewBackgroundColor: "#ffffff",
        ...(input.scene.appState && typeof input.scene.appState === "object"
          ? input.scene.appState
          : {}),
      },
      elements: Array.isArray(input.scene.elements) ? input.scene.elements : [],
      files:
        input.scene.files && typeof input.scene.files === "object"
          ? input.scene.files
          : undefined,
    };
  }

  const elements = Array.isArray(input.elements) ? input.elements : [];
  const hasElements = elements.length > 0;
  const title =
    typeof input.title === "string" && input.title.trim().length > 0
      ? input.title.trim()
      : "Untitled diagram";

  return {
    type: "excalidraw/scene",
    version: 1,
    appState: {
      viewBackgroundColor: "#ffffff",
      ...(input.appState && typeof input.appState === "object"
        ? input.appState
        : {}),
    },
    elements: hasElements ? elements : [createTitleElement(title)],
    files:
      input.files && typeof input.files === "object" ? input.files : undefined,
  };
}

const TOOL_DEFINITIONS = {
  excalidraw: [
    {
      name: "excalidraw_scene_create",
      description:
        "Create a complete Excalidraw scene. Prefer passing a full `scene` object or detailed `elements` array for the whole diagram, not just a title.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          scene: {
            type: "object",
            additionalProperties: true,
          },
          elements: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
            },
          },
          appState: {
            type: "object",
            additionalProperties: true,
          },
          files: {
            type: "object",
            additionalProperties: true,
          },
        },
        additionalProperties: false,
      },
      async execute(input) {
        return normalizeExcalidrawScene(input ?? {});
      },
    },
  ],
  github: [
    {
      name: "github_profile_me",
      description: "Read the authenticated GitHub profile.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      async execute() {
        requireToken();
        return requestJson("https://api.github.com/user", {
          headers: {
            accept: "application/vnd.github+json",
            authorization: `Bearer ${ACCESS_TOKEN}`,
            "user-agent": "z0-connectors",
          },
        });
      },
    },
    {
      name: "github_repos_list",
      description: "List repositories visible to the authenticated user.",
      inputSchema: {
        type: "object",
        properties: {
          perPage: { type: "number" },
        },
        additionalProperties: false,
      },
      async execute(input) {
        requireToken();
        const perPage = typeof input.perPage === "number" ? input.perPage : 20;
        return requestJson(`https://api.github.com/user/repos?per_page=${perPage}`, {
          headers: {
            accept: "application/vnd.github+json",
            authorization: `Bearer ${ACCESS_TOKEN}`,
            "user-agent": "z0-connectors",
          },
        });
      },
    },
  ],
  gmail: [
    {
      name: "gmail_messages_list",
      description: "List Gmail messages for the authenticated account.",
      inputSchema: {
        type: "object",
        properties: {
          maxResults: { type: "number" },
        },
        additionalProperties: false,
      },
      async execute(input) {
        requireToken();
        const maxResults =
          typeof input.maxResults === "number" ? input.maxResults : 10;
        return requestJson(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
          {
            headers: {
              authorization: `Bearer ${ACCESS_TOKEN}`,
            },
          },
        );
      },
    },
  ],
  "google-calendar": [
    {
      name: "google_calendar_events_list",
      description: "List upcoming Google Calendar events.",
      inputSchema: {
        type: "object",
        properties: {
          maxResults: { type: "number" },
        },
        additionalProperties: false,
      },
      async execute(input) {
        requireToken();
        const maxResults =
          typeof input.maxResults === "number" ? input.maxResults : 10;
        return requestJson(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=${maxResults}&timeMin=${encodeURIComponent(
            new Date().toISOString(),
          )}`,
          {
            headers: {
              authorization: `Bearer ${ACCESS_TOKEN}`,
            },
          },
        );
      },
    },
  ],
  "google-drive": [
    {
      name: "google_drive_files_list",
      description: "List files from Google Drive.",
      inputSchema: {
        type: "object",
        properties: {
          pageSize: { type: "number" },
        },
        additionalProperties: false,
      },
      async execute(input) {
        requireToken();
        const pageSize = typeof input.pageSize === "number" ? input.pageSize : 10;
        return requestJson(
          `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
          {
            headers: {
              authorization: `Bearer ${ACCESS_TOKEN}`,
            },
          },
        );
      },
    },
  ],
  notion: [
    {
      name: "notion_search",
      description: "Search accessible Notion pages and databases.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
        additionalProperties: false,
      },
      async execute(input) {
        requireToken();
        return requestJson("https://api.notion.com/v1/search", {
          method: "POST",
          headers: {
            authorization: `Bearer ${ACCESS_TOKEN}`,
            "content-type": "application/json",
            "notion-version": "2022-06-28",
          },
          body: JSON.stringify({
            query: String(input.query),
            page_size: 10,
          }),
        });
      },
    },
  ],
  figma: [
    {
      name: "figma_me",
      description: "Read the authenticated Figma profile.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      async execute() {
        requireToken();
        return requestJson("https://api.figma.com/v1/me", {
          headers: {
            authorization: `Bearer ${ACCESS_TOKEN}`,
          },
        });
      },
    },
    {
      name: "figma_file_get",
      description: "Read one Figma file by key.",
      inputSchema: {
        type: "object",
        properties: {
          fileKey: { type: "string" },
        },
        required: ["fileKey"],
        additionalProperties: false,
      },
      async execute(input) {
        requireToken();
        return requestJson(`https://api.figma.com/v1/files/${encodeURIComponent(String(input.fileKey))}`, {
          headers: {
            authorization: `Bearer ${ACCESS_TOKEN}`,
          },
        });
      },
    },
  ],
};

const tools = TOOL_DEFINITIONS[CONNECTOR_KIND] || [];
const toolByName = new Map(tools.map((tool) => [tool.name, tool]));

async function handleRequest(message) {
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: {
          name: "@z0/connectors-mcp",
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
        tools: tools.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        })),
      },
    };
  }

  if (message.method === "tools/call") {
    const tool = toolByName.get(message.params?.name);

    if (!tool) {
      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          content: [{ type: "text", text: JSON.stringify({ error: "Unknown tool" }) }],
          structuredContent: { error: "Unknown tool" },
          isError: true,
        },
      };
    }

    try {
      const payload = await tool.execute(message.params?.arguments ?? {});
      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          content: [{ type: "text", text: JSON.stringify(payload) }],
          structuredContent: payload,
          isError: false,
        },
      };
    } catch (error) {
      const payload = {
        error: error instanceof Error ? error.message : String(error),
      };
      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          content: [{ type: "text", text: JSON.stringify(payload) }],
          structuredContent: payload,
          isError: true,
        },
      };
    }
  }

  return {
    jsonrpc: "2.0",
    id: message.id,
    error: {
      code: -32601,
      message: `Unsupported method: ${message.method}`,
    },
  };
}

let buffer = Buffer.alloc(0);

// Keep the stdio MCP process alive while the parent transport owns stdin.
process.stdin.resume();

process.stdin.on("data", async (chunk) => {
  buffer = Buffer.concat([buffer, Buffer.from(chunk)]);

  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return;
    }

    const headerText = buffer.slice(0, headerEnd).toString("utf8");
    const contentLengthMatch = headerText.match(/Content-Length:\s*(\d+)/iu);

    if (!contentLengthMatch) {
      buffer = Buffer.alloc(0);
      return;
    }

    const contentLength = Number(contentLengthMatch[1]);
    const bodyStart = headerEnd + 4;

    if (buffer.length < bodyStart + contentLength) {
      return;
    }

    const body = buffer.slice(bodyStart, bodyStart + contentLength).toString("utf8");
    buffer = buffer.slice(bodyStart + contentLength);

    const response = await handleRequest(JSON.parse(body));
    if (response) {
      writeMessage(response);
    }
  }
});
