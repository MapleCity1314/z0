import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import {
  createMCPClient,
  type MCPClient,
  type MCPTransport,
} from "@ai-sdk/mcp";
import type { ToolSet } from "ai";
import { and, desc, eq } from "drizzle-orm";
import {
  getConnectorAuthStatus,
  getConnectorCatalogItem,
  type ConnectorAuthMetadata,
} from "../connectors/catalog";
import { refreshConnectorAccessToken } from "../connectors/oauth";
import { chatMcpServer, getDb, mcpServer, userMcpServer } from "@z0/db";

export type AgentMcpServerMetadata = {
  id: string;
  name: string;
  endpoint: string;
  sourceType: string;
};

export type AgentMcpServerRuntimeStatus = {
  id: string;
  name: string;
  endpoint: string;
  sourceType: string;
  availability: "available" | "unavailable";
  toolCount: number;
  retryable: boolean;
  error?: string;
};

export type AgentMcpToolMetadata = {
  name: string;
  serverName: string;
  endpoint: string;
  originalName: string;
  description?: string;
};

export type AgentMcpRuntime = {
  tools: ToolSet;
  mcpTools: AgentMcpToolMetadata[];
  serverStatuses: AgentMcpServerRuntimeStatus[];
  close: () => Promise<void>;
};

export type AgentMcpWarmResult = AgentMcpServerRuntimeStatus & {
  success: boolean;
};

const MCP_RUNTIME_IDLE_TTL_MS = 15 * 60 * 1000;

type PooledMcpRuntimeEntry = {
  key: string;
  runtime: AgentMcpRuntime;
  warmResults: AgentMcpWarmResult[];
  lastAccessedAt: number;
};

const pooledMcpRuntimes = new Map<string, Promise<PooledMcpRuntimeEntry>>();

export type AgentResolvedMcpConnection =
  | {
      kind: "http";
      url: string;
    }
  | {
      kind: "npm";
      command: string;
      args: string[];
      env?: Record<string, string>;
      cwd?: string;
    };

function slugifySegment(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug.length > 0 ? slug : "server";
}

function buildQualifiedToolName(serverName: string, toolName: string) {
  return `mcp_${slugifySegment(serverName)}_${slugifySegment(toolName)}`;
}

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function parseNpmEndpoint(endpoint: string): AgentResolvedMcpConnection | null {
  if (!endpoint.startsWith("npm:")) {
    return null;
  }

  const raw = endpoint.slice("npm:".length).trim();
  const [packageSpec, query = ""] = raw.split("?", 2);

  if (packageSpec.length === 0) {
    throw new Error("npm MCP endpoint requires a package spec");
  }

  const params = new URLSearchParams(query);
  const args = ["exec", "--yes", packageSpec, ...params.getAll("args")];
  const envEntries = [...params.entries()]
    .filter(([key]) => key.startsWith("env."))
    .map(([key, value]) => [key.slice(4), value] as const);
  const cwd = params.get("cwd") || undefined;

  return {
    kind: "npm",
    command: getNpmCommand(),
    args,
    env:
      envEntries.length > 0
        ? Object.fromEntries(envEntries)
        : undefined,
    cwd,
  };
}

export function resolveMcpConnection(
  server: AgentMcpServerMetadata,
): AgentResolvedMcpConnection {
  const npmTransport = parseNpmEndpoint(server.endpoint);

  if (npmTransport) {
    return npmTransport;
  }

  if (
    server.endpoint.startsWith("http://") ||
    server.endpoint.startsWith("https://")
  ) {
    return {
      kind: "http",
      url: server.endpoint,
    };
  }

  throw new Error(`Unsupported MCP endpoint: ${server.endpoint}`);
}

class NpmBootMcpTransport implements MCPTransport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: unknown) => void;

  #child: ChildProcessWithoutNullStreams | null = null;
  #buffer = Buffer.alloc(0);

  constructor(
    private readonly config: Extract<AgentResolvedMcpConnection, { kind: "npm" }>,
  ) {}

  async start() {
    if (this.#child) {
      return;
    }

    const child = spawn(this.config.command, this.config.args, {
      stdio: "pipe",
      cwd: this.config.cwd,
      env: {
        ...process.env,
        ...this.config.env,
      },
    });

    this.#child = child;
    child.stdout.on("data", (chunk) => {
      this.#buffer = Buffer.concat([this.#buffer, Buffer.from(chunk)]);
      this.#drainBuffer();
    });
    child.stderr.on("data", (chunk) => {
      const message = Buffer.from(chunk).toString("utf8").trim();

      if (message.length > 0) {
        this.onerror?.(new Error(message));
      }
    });
    child.on("error", (error) => {
      this.onerror?.(error);
    });
    child.on("close", () => {
      this.#child = null;
      this.onclose?.();
    });
  }

  async send(message: unknown) {
    if (!this.#child) {
      throw new Error("MCP stdio transport has not been started");
    }

    const payload = Buffer.from(JSON.stringify(message), "utf8");
    const frame = Buffer.concat([
      Buffer.from(`Content-Length: ${payload.length}\r\n\r\n`, "utf8"),
      payload,
    ]);

    await new Promise<void>((resolve, reject) => {
      this.#child?.stdin.write(frame, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  async close() {
    if (!this.#child) {
      return;
    }

    const child = this.#child;
    this.#child = null;
    child.kill();
  }

  #drainBuffer() {
    while (true) {
      const headerEnd = this.#buffer.indexOf("\r\n\r\n");

      if (headerEnd === -1) {
        return;
      }

      const headerText = this.#buffer.slice(0, headerEnd).toString("utf8");
      const contentLengthMatch = headerText.match(/Content-Length:\s*(\d+)/iu);

      if (!contentLengthMatch) {
        this.onerror?.(new Error("Missing Content-Length header in MCP stdio transport"));
        this.#buffer = Buffer.alloc(0);
        return;
      }

      const contentLength = Number(contentLengthMatch[1]);
      const bodyStart = headerEnd + 4;

      if (this.#buffer.length < bodyStart + contentLength) {
        return;
      }

      const body = this.#buffer
        .slice(bodyStart, bodyStart + contentLength)
        .toString("utf8");
      this.#buffer = this.#buffer.slice(bodyStart + contentLength);

      try {
        this.onmessage?.(JSON.parse(body));
      } catch (error) {
        this.onerror?.(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  }
}

function createTransport(
  connection: AgentResolvedMcpConnection,
): { type: "http"; url: string } | MCPTransport {
  if (connection.kind === "http") {
    return {
      type: "http",
      url: connection.url,
    };
  }

  return new NpmBootMcpTransport(connection);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildConnectorRuntimeEndpoint(params: {
  connectorSlug: string;
  metadata: ConnectorAuthMetadata | null;
}) {
  const connector = getConnectorCatalogItem(params.connectorSlug);
  if (!connector) {
    return null;
  }

  if (!connector.requiresAuth) {
    return connector.endpoint;
  }

  if (getConnectorAuthStatus(connector, params.metadata) !== "connected") {
    return null;
  }

  const accessToken = params.metadata?.accessToken;
  if (!accessToken) {
    return null;
  }

  const search = new URLSearchParams();
  search.append("args", params.connectorSlug);
  search.append("args", "server");
  search.append("env.Z0_CONNECTOR_KIND", params.connectorSlug);
  search.append("env.Z0_CONNECTOR_ACCESS_TOKEN", accessToken);
  if (params.metadata?.refreshToken) {
    search.append("env.Z0_CONNECTOR_REFRESH_TOKEN", params.metadata.refreshToken);
  }

  return `npm:@z0/connectors-mcp?${search.toString()}`;
}

async function refreshExpiredConnectorMetadata(params: {
  userMcpServerId: string;
  connectorSlug: string;
  metadata: ConnectorAuthMetadata | null;
}) {
  const connector = getConnectorCatalogItem(params.connectorSlug);
  if (!connector?.requiresAuth || !params.metadata?.refreshToken) {
    return params.metadata;
  }

  if (getConnectorAuthStatus(connector, params.metadata) !== "expired") {
    return params.metadata;
  }

  const provider = connector.authProvider ?? params.metadata.authProvider;
  if (!provider) {
    return params.metadata;
  }

  try {
    const refreshed = await refreshConnectorAccessToken({
      provider,
      refreshToken: params.metadata.refreshToken,
    });

    const nextMetadata: ConnectorAuthMetadata = {
      ...params.metadata,
      connectorSlug: params.connectorSlug,
      provider: connector.provider,
      authProvider: provider,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? params.metadata.refreshToken,
      scope: refreshed.scope ?? params.metadata.scope,
      tokenType: refreshed.tokenType ?? params.metadata.tokenType,
      expiresAt: refreshed.expiresAt ?? params.metadata.expiresAt,
      providerAccountId:
        refreshed.providerAccountId ?? params.metadata.providerAccountId,
      connectedAt: params.metadata.connectedAt ?? new Date().toISOString(),
    };

    await getDb()
      .update(userMcpServer)
      .set({
        metadata: nextMetadata,
        updatedAt: new Date(),
      })
      .where(eq(userMcpServer.id, params.userMcpServerId));

    return nextMetadata;
  } catch {
    return params.metadata;
  }
}

function mergeMcpToolMetadata(
  toolSet: ToolSet,
  server: AgentMcpServerMetadata,
  usedNames: Set<string>,
) {
  const qualifiedEntries = Object.entries(toolSet).map(([toolName, tool]) => {
    let qualifiedName = buildQualifiedToolName(server.name, toolName);

    while (usedNames.has(qualifiedName)) {
      qualifiedName = `${qualifiedName}_x`;
    }

    usedNames.add(qualifiedName);

    const description =
      typeof tool.description === "string" && tool.description.trim().length > 0
        ? `${tool.description} (MCP server: ${server.name})`
        : `Tool from MCP server ${server.name}.`;

    return {
      qualifiedName,
      tool: {
        ...tool,
        description,
      },
      metadata: {
        name: qualifiedName,
        serverName: server.name,
        endpoint: server.endpoint,
        originalName: toolName,
        description:
          typeof tool.description === "string" ? tool.description : undefined,
      } satisfies AgentMcpToolMetadata,
    };
  });

  return {
    tools: Object.fromEntries(
      qualifiedEntries.map((entry) => [entry.qualifiedName, entry.tool]),
    ) satisfies ToolSet,
    mcpTools: qualifiedEntries.map((entry) => entry.metadata),
  };
}

function buildPoolKey(params: {
  chatId: string;
  servers: AgentMcpServerMetadata[];
}) {
  const serverSignature = [...params.servers]
    .map((server) => `${server.id}:${server.endpoint}:${server.name}`)
    .sort()
    .join("|");

  return `${params.chatId}::${serverSignature}`;
}

async function disposeRuntime(entry: PooledMcpRuntimeEntry) {
  await entry.runtime.close().catch(() => undefined);
}

async function pruneIdlePooledRuntimes() {
  const now = Date.now();
  const settledEntries = await Promise.all(
    [...pooledMcpRuntimes.entries()].map(async ([key, entryPromise]) => ({
      key,
      entry: await entryPromise.catch(() => null),
    })),
  );

  for (const { key, entry } of settledEntries) {
    if (!entry) {
      pooledMcpRuntimes.delete(key);
      continue;
    }

    if (now - entry.lastAccessedAt < MCP_RUNTIME_IDLE_TTL_MS) {
      continue;
    }

    pooledMcpRuntimes.delete(key);
    await disposeRuntime(entry);
  }
}

async function createRuntimeWithWarmResults(params: {
  servers: AgentMcpServerMetadata[];
  reservedToolNames?: Iterable<string>;
}) {
  const clients: MCPClient[] = [];
  const usedNames = new Set(params.reservedToolNames ?? []);
  const toolSets: ToolSet[] = [];
  const metadata: AgentMcpToolMetadata[] = [];
  const serverStatuses: AgentMcpServerRuntimeStatus[] = [];

  for (const server of params.servers) {
    try {
      const transport = createTransport(resolveMcpConnection(server));
      const client = await createMCPClient({
        transport,
      });

      const serverTools = await client.tools();
      const merged = mergeMcpToolMetadata(serverTools, server, usedNames);

      clients.push(client);
      toolSets.push(merged.tools);
      metadata.push(...merged.mcpTools);
      serverStatuses.push({
        id: server.id,
        name: server.name,
        endpoint: server.endpoint,
        sourceType: server.sourceType,
        availability: "available",
        toolCount: Object.keys(serverTools).length,
        retryable: false,
      });
    } catch (error) {
      serverStatuses.push({
        id: server.id,
        name: server.name,
        endpoint: server.endpoint,
        sourceType: server.sourceType,
        availability: "unavailable",
        toolCount: 0,
        retryable: true,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    runtime: {
      tools: Object.assign({}, ...toolSets) satisfies ToolSet,
      mcpTools: metadata,
      serverStatuses,
      close: async () => {
        await Promise.all(
          clients.map((client) => client.close().catch(() => undefined)),
        );
      },
    } satisfies AgentMcpRuntime,
    warmResults: serverStatuses.map((status) => ({
      ...status,
      success: status.availability === "available",
    })),
  };
}

async function resolvePooledEntry(
  key: string,
  entryPromise: Promise<PooledMcpRuntimeEntry>,
) {
  try {
    return await entryPromise;
  } catch (error) {
    pooledMcpRuntimes.delete(key);
    throw error;
  }
}

export async function getConfiguredMcpServers(params: {
  userId: string;
  chatId: string;
}): Promise<AgentMcpServerMetadata[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: mcpServer.id,
      userMcpServerId: userMcpServer.id,
      name: mcpServer.name,
      endpoint: mcpServer.endpoint,
      sourceType: mcpServer.sourceType,
      systemMetadata: mcpServer.metadata,
      userMetadata: userMcpServer.metadata,
    })
    .from(chatMcpServer)
    .innerJoin(
      userMcpServer,
      eq(chatMcpServer.userMcpServerId, userMcpServer.id),
    )
    .innerJoin(mcpServer, eq(userMcpServer.mcpServerId, mcpServer.id))
    .where(
      and(
        eq(chatMcpServer.chatId, params.chatId),
        eq(chatMcpServer.enabled, true),
        eq(userMcpServer.userId, params.userId),
        eq(mcpServer.isActive, true),
      ),
    )
    .orderBy(desc(userMcpServer.updatedAt));

  const servers: AgentMcpServerMetadata[] = [];

  for (const row of rows) {
    const initialMetadata =
      isObjectRecord(row.userMetadata)
        ? (row.userMetadata as ConnectorAuthMetadata)
        : null;
    const connectorSlug =
      typeof initialMetadata?.connectorSlug === "string"
        ? initialMetadata.connectorSlug
        : isObjectRecord(row.systemMetadata) &&
            typeof row.systemMetadata.slug === "string"
          ? row.systemMetadata.slug
          : null;
    const userMetadata = connectorSlug
      ? await refreshExpiredConnectorMetadata({
          userMcpServerId: row.userMcpServerId,
          connectorSlug,
          metadata: initialMetadata,
        })
      : initialMetadata;
    const endpoint =
      connectorSlug
        ? buildConnectorRuntimeEndpoint({
            connectorSlug,
            metadata: userMetadata,
          }) ?? null
        : row.endpoint;

    if (!endpoint) {
      continue;
    }

    servers.push({
      id: row.id,
      name: row.name,
      endpoint,
      sourceType: row.sourceType ?? "external",
    });
  }

  return servers;
}

export async function createConfiguredMcpToolRuntime(params: {
  servers: AgentMcpServerMetadata[];
  reservedToolNames?: Iterable<string>;
}): Promise<AgentMcpRuntime> {
  const result = await createRuntimeWithWarmResults(params);
  return result.runtime;
}

export async function warmMcpServers(params: {
  servers: AgentMcpServerMetadata[];
}): Promise<AgentMcpWarmResult[]> {
  const result = await createRuntimeWithWarmResults(params);
  await result.runtime.close().catch(() => undefined);
  return result.warmResults;
}

export async function getOrCreatePooledMcpToolRuntime(params: {
  chatId: string;
  servers: AgentMcpServerMetadata[];
  reservedToolNames?: Iterable<string>;
}): Promise<AgentMcpRuntime> {
  await pruneIdlePooledRuntimes();

  const key = buildPoolKey({
    chatId: params.chatId,
    servers: params.servers,
  });
  const existing = pooledMcpRuntimes.get(key);

  if (existing) {
    const entry = await resolvePooledEntry(key, existing);
    entry.lastAccessedAt = Date.now();
    return {
      ...entry.runtime,
      close: async () => undefined,
    };
  }

  const createdEntryPromise = createRuntimeWithWarmResults({
    servers: params.servers,
    reservedToolNames: params.reservedToolNames,
  }).then(({ runtime, warmResults }) => ({
    key,
    runtime,
    warmResults,
    lastAccessedAt: Date.now(),
  }));

  pooledMcpRuntimes.set(key, createdEntryPromise);

  try {
    const entry = await createdEntryPromise;
    return {
      ...entry.runtime,
      close: async () => undefined,
    };
  } catch (error) {
    pooledMcpRuntimes.delete(key);
    throw error;
  }
}

export async function warmPooledMcpServers(params: {
  chatId: string;
  servers: AgentMcpServerMetadata[];
  reservedToolNames?: Iterable<string>;
}): Promise<AgentMcpWarmResult[]> {
  await pruneIdlePooledRuntimes();

  const key = buildPoolKey({
    chatId: params.chatId,
    servers: params.servers,
  });
  const existing = pooledMcpRuntimes.get(key);

  if (existing) {
    const entry = await resolvePooledEntry(key, existing);
    entry.lastAccessedAt = Date.now();
    return entry.warmResults;
  }

  const createdEntryPromise = createRuntimeWithWarmResults({
    servers: params.servers,
    reservedToolNames: params.reservedToolNames,
  }).then(({ runtime, warmResults }) => ({
    key,
    runtime,
    warmResults,
    lastAccessedAt: Date.now(),
  }));

  pooledMcpRuntimes.set(key, createdEntryPromise);

  try {
    const entry = await createdEntryPromise;
    return entry.warmResults;
  } catch (error) {
    pooledMcpRuntimes.delete(key);
    throw error;
  }
}
