import { Hono } from "hono";
import type { Bindings, TokenResponse } from "./types";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// GitHub OAuth token exchange 엔드포인트
app.post("/auth/github/token", async (c) => {
  try {
    const { code } = await c.req.json();
    const client_id = c.env.GITHUB_CLIENT_ID;
    const client_secret = c.env.GITHUB_CLIENT_SECRET;

    if (!client_id || !client_secret) {
      console.error("GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not set");
      return c.json(
        {
          error: "GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not set",
        },
        500
      );
    }

    // 필수 파라미터 검증
    if (!code) {
      return c.json(
        {
          error: "Missing required parameters: code",
        },
        400
      );
    }

    // GitHub OAuth token exchange API 호출
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "qn-api",
        },
        body: JSON.stringify({
          client_id,
          client_secret,
          code,
        }),
      }
    );

    const tokenData = (await tokenResponse.json()) as TokenResponse;

    // GitHub API 오류 처리
    if (tokenData.error) {
      return c.json(
        {
          error: "GitHub OAuth error",
          details: tokenData.error_description || tokenData.error,
        },
        400
      );
    }

    // access token이 없는 경우
    if (!tokenData.access_token) {
      return c.json(
        {
          error: "Failed to obtain access token",
        },
        400
      );
    }

    return c.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || "bearer",
      scope: tokenData.scope,
    });
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    return c.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// 헬스체크 엔드포인트
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
