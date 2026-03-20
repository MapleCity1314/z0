"use server";

import { redirect } from "next/navigation";
import {
  buildConnectorAuthorizeUrl,
  encodeConnectorOAuthState,
} from "@z0/backend";
import { getSystemMcpServerBySlug } from "@/lib/db/integrations";
import { requireAuth } from "@/lib/session";

function normalizeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

export async function beginConnectorAuthorizationAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const chatIdValue = String(formData.get("chatId") ?? "");
  const returnTo = normalizeReturnTo(String(formData.get("returnTo") ?? "/"));
  const consentAccepted = formData.get("consentAccepted") === "on";

  const user = await requireAuth();
  const server = await getSystemMcpServerBySlug(slug);

  if (!server) {
    redirect("/?connectorAuth=missing");
  }

  if (server.consentRequired && !consentAccepted) {
    redirect(
      `/connectors/${slug}?chatId=${encodeURIComponent(
        chatIdValue,
      )}&returnTo=${encodeURIComponent(returnTo)}&error=consent`,
    );
  }

  const state = encodeConnectorOAuthState({
    userId: user.id,
    connectorSlug: slug,
    chatId: chatIdValue.length > 0 ? chatIdValue : null,
    returnTo,
    consentGrantedAt: new Date().toISOString(),
  });

  redirect(
    buildConnectorAuthorizeUrl({
      connectorSlug: slug,
      state,
    }),
  );
}
