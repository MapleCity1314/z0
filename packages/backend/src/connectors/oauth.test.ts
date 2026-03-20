import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshConnectorAccessToken } from "./oauth";

describe("refreshConnectorAccessToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CONNECTOR_GOOGLE_CLIENT_ID;
    delete process.env.CONNECTOR_GOOGLE_CLIENT_SECRET;
    delete process.env.CONNECTOR_FIGMA_CLIENT_ID;
    delete process.env.CONNECTOR_FIGMA_CLIENT_SECRET;
  });

  it("refreshes Google connector tokens and preserves the refresh token when Google omits rotation", async () => {
    process.env.CONNECTOR_GOOGLE_CLIENT_ID = "google-client";
    process.env.CONNECTOR_GOOGLE_CLIENT_SECRET = "google-secret";

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "fresh-access-token",
            expires_in: 3600,
            scope: "openid email",
            token_type: "Bearer",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const result = await refreshConnectorAccessToken({
      provider: "google",
      refreshToken: "existing-refresh-token",
    });

    expect(result).toEqual({
      accessToken: "fresh-access-token",
      refreshToken: "existing-refresh-token",
      scope: "openid email",
      tokenType: "Bearer",
      expiresAt: expect.any(String),
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/x-www-form-urlencoded",
        }),
        body: expect.any(URLSearchParams),
      }),
    );
  });

  it("refreshes Figma connector tokens when a rotated refresh token is returned", async () => {
    process.env.CONNECTOR_FIGMA_CLIENT_ID = "figma-client";
    process.env.CONNECTOR_FIGMA_CLIENT_SECRET = "figma-secret";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "figma-access-token",
          refresh_token: "figma-refresh-token-2",
          expires_in: 1800,
          scope: "file_content:read",
          token_type: "Bearer",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await refreshConnectorAccessToken({
      provider: "figma",
      refreshToken: "figma-refresh-token-1",
    });

    expect(result).toEqual({
      accessToken: "figma-access-token",
      refreshToken: "figma-refresh-token-2",
      scope: "file_content:read",
      tokenType: "Bearer",
      expiresAt: expect.any(String),
    });
  });
});
