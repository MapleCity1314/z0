import {
  getConnectorAuthStatus,
  getConnectorCatalogItem,
  type ConnectorAuthMetadata,
} from "@z0/backend";
import type {
  IntegrationMcpServerDto,
  SystemMcpMarketItemDto,
} from "@z0/shared-types";

type RawMarketMetadata = Partial<{
  slug: unknown;
  icon: unknown;
  category: unknown;
  provider: unknown;
  shortDescription: unknown;
  setupLabel: unknown;
  docsUrl: unknown;
  tags: unknown;
  recommended: unknown;
  requiresSetup: unknown;
}>;

type MarketRow = {
  systemServerId: string;
  name: string;
  endpoint: string;
  sourceType: string | null;
  metadata: unknown;
};

type UserMarketRow = {
  userMcpServerId: string;
  systemServerId: string;
  systemServerName: string;
  endpoint: string;
  sourceType: string | null;
  useByDefault: boolean;
  enabledInChat: boolean;
  metadata: unknown;
  systemMetadata?: unknown;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : undefined;
}

function isDirectEndpoint(endpoint: string) {
  return endpoint.startsWith("https://") || endpoint.startsWith("http://");
}

export function mapSystemMcpMarketItem(row: MarketRow): SystemMcpMarketItemDto {
  const metadata: RawMarketMetadata = isRecord(row.metadata) ? row.metadata : {};
  const sourceType = row.sourceType ?? "external";
  const slug =
    asString(metadata.slug) ?? (slugify(row.name) || row.systemServerId);
  const provider = asString(metadata.provider) ?? row.name;

  const connector = sourceType === "market" ? getConnectorCatalogItem(slug) : null;
  const runtimeReadyWithoutAuth =
    connector !== null &&
    connector.requiresAuth === false &&
    connector.endpoint.startsWith("npm:");
  const requiresSetup =
    (asBoolean(metadata.requiresSetup) ?? !isDirectEndpoint(row.endpoint)) &&
    !runtimeReadyWithoutAuth;

  return {
    systemServerId: row.systemServerId,
    name: row.name,
    endpoint: row.endpoint,
    sourceType,
    slug,
    icon: asString(metadata.icon) ?? slug,
    category: asString(metadata.category) ?? "General",
    provider,
    shortDescription:
      asString(metadata.shortDescription) ??
      `${row.name} tools for your agent workflows.`,
    setupLabel:
      asString(metadata.setupLabel) ??
      (requiresSetup ? "Requires external setup" : "Quick add"),
    docsUrl: asString(metadata.docsUrl) ?? null,
    tags: asStringArray(metadata.tags) ?? [],
    recommended: asBoolean(metadata.recommended) ?? false,
    requiresSetup,
    requiresAuth: connector?.requiresAuth ?? false,
    authProvider: connector?.authProvider ?? null,
    privacyLevel: connector?.privacyLevel ?? null,
    consentRequired: connector?.consentRequired ?? false,
    scopes: connector?.scopes ?? [],
  };
}

export function isDirectSystemMcpEndpoint(endpoint: string) {
  return isDirectEndpoint(endpoint);
}

export function mapIntegrationMcpServer(row: UserMarketRow): IntegrationMcpServerDto {
  const metadata = isRecord(row.metadata)
    ? (row.metadata as ConnectorAuthMetadata)
    : null;
  const systemMetadata = isRecord(row.systemMetadata) ? row.systemMetadata : null;
  const connector =
    row.sourceType === "market" || typeof metadata?.connectorSlug === "string"
      ? getConnectorCatalogItem(
          typeof metadata?.connectorSlug === "string"
            ? metadata.connectorSlug
            : typeof systemMetadata?.slug === "string"
              ? systemMetadata.slug
              : "",
        ) ?? null
      : null;

  return {
    userMcpServerId: row.userMcpServerId,
    systemServerId: row.systemServerId,
    systemServerName: row.systemServerName,
    endpoint: row.endpoint,
    sourceType: row.sourceType ?? "external",
    useByDefault: row.useByDefault,
    enabledInChat: row.enabledInChat,
    connectorSlug: connector?.slug ?? null,
    requiresAuth: connector?.requiresAuth ?? false,
    authProvider: connector?.authProvider ?? null,
    authStatus: getConnectorAuthStatus(connector, metadata),
    privacyLevel: connector?.privacyLevel ?? null,
    connectedAt: typeof metadata?.connectedAt === "string" ? metadata.connectedAt : null,
    consentGrantedAt:
      typeof metadata?.consentGrantedAt === "string"
        ? metadata.consentGrantedAt
        : null,
  };
}
