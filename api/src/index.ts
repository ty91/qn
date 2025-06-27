import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import dotenv from "dotenv";

// .env 파일 로드
dotenv.config();

const app = new Hono();

// CORS 설정 (모바일 앱에서 접근할 수 있도록)
app.use(
  "/*",
  cors({
    origin: "*", // 실제 운영에서는 특정 도메인으로 제한하세요
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// GitHub OAuth token exchange 엔드포인트
app.post("/auth/github/token", async (c) => {
  try {
    const { code } = await c.req.json();
    const client_id = process.env.GITHUB_CLIENT_ID!;
    const client_secret = process.env.GITHUB_CLIENT_SECRET!;

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

    const tokenData = await tokenResponse.json();

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

const server = serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);

// graceful shutdown
process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
