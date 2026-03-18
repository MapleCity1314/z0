import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";
import { and, desc, eq } from "drizzle-orm";
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
      const client = await createMCPClient({
        transport: {
          type: "http",
          url: server.endpoint,
        },
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
      name: mcpServer.name,
      endpoint: mcpServer.endpoint,
      sourceType: mcpServer.sourceType,
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

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    endpoint: row.endpoint,
    sourceType: row.sourceType ?? "external",
  }));
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
