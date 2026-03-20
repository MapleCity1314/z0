export type ConnectorPrivacyLevel = "low" | "high";

export type ConnectorCatalogItem = {
  slug: string;
  provider: string;
  displayName: string;
  requiresAuth: boolean;
  authProvider: string | null;
  privacyLevel: ConnectorPrivacyLevel;
  consentRequired: boolean;
  scopes: string[];
  setupLabel: string;
  docsUrl: string | null;
  endpoint: string;
};

const connectorCatalog = {
  excalidraw: {
    slug: "excalidraw",
    provider: "Excalidraw",
    displayName: "Excalidraw",
    requiresAuth: false,
    authProvider: null,
    privacyLevel: "low",
    consentRequired: false,
    scopes: [],
    setupLabel: "Quick add",
    docsUrl: "https://excalidraw.com/",
    endpoint:
      "npm:@z0/connectors-mcp?args=excalidraw&args=server",
  },
  notion: {
    slug: "notion",
    provider: "Notion",
    displayName: "Notion",
    requiresAuth: true,
    authProvider: "notion",
    privacyLevel: "high",
    consentRequired: true,
    scopes: [],
    setupLabel: "Review access and connect",
    docsUrl: "https://www.notion.so/product",
    endpoint: "setup://notion",
  },
  github: {
    slug: "github",
    provider: "GitHub",
    displayName: "GitHub",
    requiresAuth: true,
    authProvider: "github",
    privacyLevel: "high",
    consentRequired: true,
    scopes: ["read:user", "repo"],
    setupLabel: "Review access and connect",
    docsUrl: "https://github.com/",
    endpoint: "setup://github",
  },
  gmail: {
    slug: "gmail",
    provider: "Google",
    displayName: "Gmail",
    requiresAuth: true,
    authProvider: "google",
    privacyLevel: "high",
    consentRequired: true,
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
    setupLabel: "Review access and connect",
    docsUrl: "https://workspace.google.com/products/gmail/",
    endpoint: "setup://gmail",
  },
  "google-calendar": {
    slug: "google-calendar",
    provider: "Google",
    displayName: "Google Calendar",
    requiresAuth: true,
    authProvider: "google",
    privacyLevel: "high",
    consentRequired: true,
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    setupLabel: "Review access and connect",
    docsUrl: "https://workspace.google.com/products/calendar/",
    endpoint: "setup://google-calendar",
  },
  "google-drive": {
    slug: "google-drive",
    provider: "Google",
    displayName: "Google Drive",
    requiresAuth: true,
    authProvider: "google",
    privacyLevel: "high",
    consentRequired: true,
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
    setupLabel: "Review access and connect",
    docsUrl: "https://workspace.google.com/products/drive/",
    endpoint: "setup://google-drive",
  },
  figma: {
    slug: "figma",
    provider: "Figma",
    displayName: "Figma",
    requiresAuth: true,
    authProvider: "figma",
    privacyLevel: "high",
    consentRequired: true,
    scopes: ["file_content:read"],
    setupLabel: "Review access and connect",
    docsUrl: "https://www.figma.com/",
    endpoint: "setup://figma",
  },
} satisfies Record<string, ConnectorCatalogItem>;

export type ConnectorSlug = keyof typeof connectorCatalog;

export function getConnectorCatalogItem(slug: string) {
  return connectorCatalog[slug as ConnectorSlug] ?? null;
}

export function listConnectorCatalogItems() {
  return Object.values(connectorCatalog);
}

export type ConnectorAuthMetadata = {
  connectorSlug?: string;
  provider?: string;
  authProvider?: string;
  accessToken?: string;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
  expiresAt?: string;
  providerAccountId?: string;
  connectedAt?: string;
  consentGrantedAt?: string;
};

export function getConnectorAuthStatus(
  connector: Pick<ConnectorCatalogItem, "requiresAuth"> | null,
  metadata: ConnectorAuthMetadata | null | undefined,
): "not-required" | "not-connected" | "connected" | "expired" {
  if (!connector?.requiresAuth) {
    return "not-required";
  }

  if (!metadata?.accessToken) {
    return "not-connected";
  }

  if (metadata.expiresAt) {
    const expiresAt = Date.parse(metadata.expiresAt);
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      return "expired";
    }
  }

  return "connected";
}
