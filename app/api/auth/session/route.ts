import { NextRequest, NextResponse } from "next/server";
import { authForwardHeaders, BACKEND_URL, clearAuthCookieOptions, readBackendJson, shouldClearAuthCookie } from "@/app/api/_utils/backend";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
      headers: authForwardHeaders(req),
    });

    const data = await readBackendJson(res);
    const response = NextResponse.json(data, { status: res.status });
    if (shouldClearAuthCookie(res.status, data)) {
      response.cookies.set("auth_token", "", clearAuthCookieOptions);
    }
    return response;
  } catch (error) {
    console.error("Session proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable. Session could not be restored." },
      { status: 503 }
    );
  }
}
