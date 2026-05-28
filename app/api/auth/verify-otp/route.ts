import { NextRequest, NextResponse } from "next/server";
import { authCookieOptions, BACKEND_URL, clearAuthCookieOptions, readBackendJson } from "@/app/api/_utils/backend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await readBackendJson(res);

    const response = NextResponse.json(data, { status: res.status });
    const authData = data as { token?: unknown; data?: { token?: unknown } };
    const token = authData.token ?? authData.data?.token;

    if (res.ok && typeof token === "string") {
      response.cookies.set("auth_token", token, authCookieOptions);
    } else if (!res.ok) {
      response.cookies.set("auth_token", "", clearAuthCookieOptions);
    }

    return response;
  } catch (error) {
    console.error("OTP verification proxy error:", error);
    return NextResponse.json(
      { message: "Backend is not reachable. Please start the backend server." },
      { status: 503 }
    );
  }
}
