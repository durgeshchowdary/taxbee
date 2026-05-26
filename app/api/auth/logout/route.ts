import { NextRequest, NextResponse } from "next/server";
import { authForwardHeaders, BACKEND_URL, clearAuthCookieOptions, readBackendJson } from "@/app/api/_utils/backend";

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: authForwardHeaders(req),
    });
    const response = NextResponse.json(await readBackendJson(res), { status: res.status });
    response.cookies.set("auth_token", "", clearAuthCookieOptions);
    return response;
  } catch (error) {
    console.error("Logout proxy error:", error);
    const response = NextResponse.json(
      { success: false, message: "Backend is not reachable, but local session cookie was cleared." },
      { status: 503 }
    );
    response.cookies.set("auth_token", "", clearAuthCookieOptions);
    return response;
  }
}
