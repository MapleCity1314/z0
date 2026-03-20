import { NextResponse } from "next/server";
import {
  decodeConnectorOAuthState,
  exchangeConnectorCode,
} from "@z0/backend";
import {
  connectOAuthMcpServerForUser,
  getSystemMcpServerBySlug,
} from "@/lib/db/integrations";

function withStatus(returnTo: string, status: string) {
  const url = new URL(returnTo, "http://localhost");
  url.searchParams.set("connectorAuth", status);
  return `${url.pathname}${url.search}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const stateValue = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");

  if (!stateValue) {
    return NextResponse.redirect(new URL("/?connectorAuth=missing-state", request.url));
  }

  const state = decodeConnectorOAuthState(stateValue);
  const returnTo = state.returnTo.startsWith("/") ? state.returnTo : "/";

  if (error || !code) {
    return NextResponse.redirect(new URL(withStatus(returnTo, "failed"), request.url));
  }

  const server = await getSystemMcpServerBySlug(state.connectorSlug);
  if (!server || server.authProvider !== provider) {
    return NextResponse.redirect(new URL(withStatus(returnTo, "mismatch"), request.url));
  }

  const token = await exchangeConnectorCode({
    provider,
    code,
  });

  await connectOAuthMcpServerForUser({
    userId: state.userId,
    systemServerId: server.systemServerId,
    chatId: state.chatId,
    metadata: {
      connectorSlug: server.slug,
      provider: server.provider,
      authProvider: provider,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      scope: token.scope,
      tokenType: token.tokenType,
      expiresAt: token.expiresAt,
      providerAccountId: token.providerAccountId,
      connectedAt: new Date().toISOString(),
      consentGrantedAt: state.consentGrantedAt,
    },
  });

  return NextResponse.redirect(new URL(withStatus(returnTo, "connected"), request.url));
}
