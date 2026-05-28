import { NextRequest, NextResponse } from "next/server";
import { authForwardHeaders, BACKEND_URL, clearAuthCookieOptions, shouldClearAuthCookie } from "@/app/api/_utils/backend";

const BACKEND_TIMEOUT_MS = 35_000;

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await req.json();
    const res = await fetchWithTimeout(
      `${BACKEND_URL}/api/ai/bee-assistant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
          ...authForwardHeaders(req),
        },
        body: JSON.stringify(body),
      },
      BACKEND_TIMEOUT_MS
    );

    const text = await res.text();
    let data: Record<string, unknown> = {
      reply: "Backend returned an empty response.",
      requestId,
      degraded: true,
    };

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { reply: text.slice(0, 300), requestId, degraded: true };
      }
    }

    if (!data.reply && typeof data.message === "string") {
      data.reply = data.message;
    }

    const response = NextResponse.json({ ...data, requestId }, { status: res.status });
    if (shouldClearAuthCookie(res.status, data)) {
      response.cookies.set("auth_token", "", clearAuthCookieOptions);
    }
    return response;
  } catch (error) {
    console.error("Bee Assistant proxy error:", error);
    const isTimeout = error instanceof Error && error.name === "AbortError";

    return NextResponse.json(
      {
        reply: isTimeout
          ? "Bee Assistant is taking longer than expected. Please try again in a moment."
          : "Backend is not reachable. Please start the backend server.",
        requestId,
        degraded: true,
        retryable: true,
      },
      { status: 503 }
    );
  }
}
