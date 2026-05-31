import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("cookie") || "";

    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/session`, {
      method: "GET",
      headers: {
        cookie,
        accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await backendResponse.json().catch(() => ({
      success: false,
      message: "Session check failed",
    }));

    const response = NextResponse.json(data, {
      status: backendResponse.status,
    });

    const setCookie = backendResponse.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Backend is not reachable. Session could not be restored.",
        code: "BACKEND_UNREACHABLE",
      },
      { status: 503 }
    );
  }
}