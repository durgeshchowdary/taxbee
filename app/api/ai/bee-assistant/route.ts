import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";
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

    return NextResponse.json({ ...data, requestId }, { status: res.status });
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
