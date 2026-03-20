import { createHmac, timingSafeEqual } from "node:crypto";

type ConnectorOAuthState = {
  userId: string;
  connectorSlug: string;
  chatId: string | null;
  returnTo: string;
  consentGrantedAt: string;
};

function getStateSecret() {
  return process.env.BETTER_AUTH_SECRET ?? "development-connector-secret";
}

export function encodeConnectorOAuthState(payload: ConnectorOAuthState) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", getStateSecret())
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

export function decodeConnectorOAuthState(value: string): ConnectorOAuthState {
  const [body, signature] = value.split(".", 2);

  if (!body || !signature) {
    throw new Error("Invalid connector OAuth state");
  }

  const expectedSignature = createHmac("sha256", getStateSecret())
    .update(body)
    .digest("base64url");

  if (signature.length !== expectedSignature.length) {
    throw new Error("Invalid connector OAuth state signature");
  }

  if (
    !timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSignature, "utf8"),
    )
  ) {
    throw new Error("Invalid connector OAuth state signature");
  }

  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ConnectorOAuthState;
}

type TokenResult = {
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
  expiresAt?: string;
  providerAccountId?: string;
};

export type ConnectorTokenRefreshResult = TokenResult;

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required connector OAuth env: ${name}`);
  }
  return value;
}

export function buildConnectorAuthorizeUrl(params: {
  connectorSlug: string;
  state: string;
}) {
  const callbackBase = new URL(getAppUrl());
  const connector = params.connectorSlug;

  if (connector === "github") {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", getRequiredEnv("CONNECTOR_GITHUB_CLIENT_ID"));
    url.searchParams.set(
      "redirect_uri",
      new URL("/connectors/callback/github", callbackBase).toString(),
    );
    url.searchParams.set("scope", "read:user repo");
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  if (
    connector === "gmail" ||
    connector === "google-calendar" ||
    connector === "google-drive"
  ) {
    const scopes =
      connector === "gmail"
        ? [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
          ]
        : connector === "google-calendar"
          ? [
              "openid",
              "email",
              "profile",
              "https://www.googleapis.com/auth/calendar.readonly",
            ]
          : [
              "openid",
              "email",
              "profile",
              "https://www.googleapis.com/auth/drive.readonly",
            ];
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", getRequiredEnv("CONNECTOR_GOOGLE_CLIENT_ID"));
    url.searchParams.set(
      "redirect_uri",
      new URL("/connectors/callback/google", callbackBase).toString(),
    );
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  if (connector === "notion") {
    const url = new URL("https://api.notion.com/v1/oauth/authorize");
    url.searchParams.set("client_id", getRequiredEnv("CONNECTOR_NOTION_CLIENT_ID"));
    url.searchParams.set(
      "redirect_uri",
      new URL("/connectors/callback/notion", callbackBase).toString(),
    );
    url.searchParams.set("response_type", "code");
    url.searchParams.set("owner", "user");
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  if (connector === "figma") {
    const url = new URL("https://www.figma.com/oauth");
    url.searchParams.set("client_id", getRequiredEnv("CONNECTOR_FIGMA_CLIENT_ID"));
    url.searchParams.set(
      "redirect_uri",
      new URL("/connectors/callback/figma", callbackBase).toString(),
    );
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "file_content:read");
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  throw new Error(`Unsupported connector auth flow: ${connector}`);
}

async function postFormToken(
  url: string,
  body: URLSearchParams,
  authHeader?: string,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed with ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

function getExpiresAtFromPayload(payload: Record<string, unknown>) {
  return typeof payload.expires_in === "number"
    ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
    : undefined;
}

export async function exchangeConnectorCode(params: {
  provider: string;
  code: string;
}) : Promise<TokenResult> {
  const callbackBase = new URL(getAppUrl());

  if (params.provider === "github") {
    const body = new URLSearchParams({
      client_id: getRequiredEnv("CONNECTOR_GITHUB_CLIENT_ID"),
      client_secret: getRequiredEnv("CONNECTOR_GITHUB_CLIENT_SECRET"),
      code: params.code,
      redirect_uri: new URL("/connectors/callback/github", callbackBase).toString(),
    });
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!response.ok) {
      throw new Error(`GitHub token exchange failed with ${response.status}`);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${String(payload.access_token ?? "")}`,
        "user-agent": "z0-connectors",
      },
    });
    const profile = profileResponse.ok
      ? ((await profileResponse.json()) as Record<string, unknown>)
      : null;
    return {
      accessToken: String(payload.access_token ?? ""),
      scope: typeof payload.scope === "string" ? payload.scope : undefined,
      tokenType: typeof payload.token_type === "string" ? payload.token_type : undefined,
      providerAccountId:
        profile && typeof profile.id !== "undefined" ? String(profile.id) : undefined,
    };
  }

  if (params.provider === "google") {
    const body = new URLSearchParams({
      client_id: getRequiredEnv("CONNECTOR_GOOGLE_CLIENT_ID"),
      client_secret: getRequiredEnv("CONNECTOR_GOOGLE_CLIENT_SECRET"),
      code: params.code,
      grant_type: "authorization_code",
      redirect_uri: new URL("/connectors/callback/google", callbackBase).toString(),
    });
    const payload = await postFormToken("https://oauth2.googleapis.com/token", body);
    const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        authorization: `Bearer ${String(payload.access_token ?? "")}`,
      },
    });
    const profile = userInfoResponse.ok
      ? ((await userInfoResponse.json()) as Record<string, unknown>)
      : null;
    return {
      accessToken: String(payload.access_token ?? ""),
      refreshToken:
        typeof payload.refresh_token === "string" ? payload.refresh_token : undefined,
      scope: typeof payload.scope === "string" ? payload.scope : undefined,
      tokenType: typeof payload.token_type === "string" ? payload.token_type : undefined,
      expiresAt: getExpiresAtFromPayload(payload),
      providerAccountId:
        profile && typeof profile.sub === "string" ? profile.sub : undefined,
    };
  }

  if (params.provider === "notion") {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: new URL("/connectors/callback/notion", callbackBase).toString(),
    });
    const authHeader = `Basic ${Buffer.from(
      `${getRequiredEnv("CONNECTOR_NOTION_CLIENT_ID")}:${getRequiredEnv("CONNECTOR_NOTION_CLIENT_SECRET")}`,
      "utf8",
    ).toString("base64")}`;
    const payload = await postFormToken(
      "https://api.notion.com/v1/oauth/token",
      body,
      authHeader,
    );
    return {
      accessToken: String(payload.access_token ?? ""),
      tokenType: typeof payload.token_type === "string" ? payload.token_type : undefined,
      providerAccountId:
        typeof payload.workspace_id === "string" ? payload.workspace_id : undefined,
    };
  }

  if (params.provider === "figma") {
    const body = new URLSearchParams({
      client_id: getRequiredEnv("CONNECTOR_FIGMA_CLIENT_ID"),
      client_secret: getRequiredEnv("CONNECTOR_FIGMA_CLIENT_SECRET"),
      redirect_uri: new URL("/connectors/callback/figma", callbackBase).toString(),
      code: params.code,
      grant_type: "authorization_code",
    });
    const payload = await postFormToken("https://api.figma.com/v1/oauth/token", body);
    const meResponse = await fetch("https://api.figma.com/v1/me", {
      headers: {
        authorization: `Bearer ${String(payload.access_token ?? "")}`,
      },
    });
    const profile = meResponse.ok
      ? ((await meResponse.json()) as { id?: string })
      : null;
    return {
      accessToken: String(payload.access_token ?? ""),
      refreshToken:
        typeof payload.refresh_token === "string" ? payload.refresh_token : undefined,
      scope: typeof payload.scope === "string" ? payload.scope : undefined,
      providerAccountId: profile?.id,
    };
  }

  throw new Error(`Unsupported connector OAuth provider: ${params.provider}`);
}

export async function refreshConnectorAccessToken(params: {
  provider: string;
  refreshToken: string;
}): Promise<ConnectorTokenRefreshResult> {
  if (params.provider === "google") {
    const payload = await postFormToken(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        client_id: getRequiredEnv("CONNECTOR_GOOGLE_CLIENT_ID"),
        client_secret: getRequiredEnv("CONNECTOR_GOOGLE_CLIENT_SECRET"),
        grant_type: "refresh_token",
        refresh_token: params.refreshToken,
      }),
    );

    return {
      accessToken: String(payload.access_token ?? ""),
      refreshToken:
        typeof payload.refresh_token === "string"
          ? payload.refresh_token
          : params.refreshToken,
      scope: typeof payload.scope === "string" ? payload.scope : undefined,
      tokenType:
        typeof payload.token_type === "string" ? payload.token_type : undefined,
      expiresAt: getExpiresAtFromPayload(payload),
    };
  }

  if (params.provider === "figma") {
    const payload = await postFormToken(
      "https://api.figma.com/v1/oauth/refresh",
      new URLSearchParams({
        client_id: getRequiredEnv("CONNECTOR_FIGMA_CLIENT_ID"),
        client_secret: getRequiredEnv("CONNECTOR_FIGMA_CLIENT_SECRET"),
        grant_type: "refresh_token",
        refresh_token: params.refreshToken,
      }),
    );

    return {
      accessToken: String(payload.access_token ?? ""),
      refreshToken:
        typeof payload.refresh_token === "string"
          ? payload.refresh_token
          : params.refreshToken,
      scope: typeof payload.scope === "string" ? payload.scope : undefined,
      tokenType:
        typeof payload.token_type === "string" ? payload.token_type : undefined,
      expiresAt: getExpiresAtFromPayload(payload),
    };
  }

  throw new Error(`Unsupported connector token refresh provider: ${params.provider}`);
}
