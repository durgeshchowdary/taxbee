import { NextRequest, NextResponse } from "next/server";
import { authForwardHeaders, BACKEND_URL, readBackendJson } from "@/app/api/_utils/backend";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
      headers: authForwardHeaders(req),
    });

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("Session proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable. Session could not be restored." },
      { status: 503 }
    );
  }
}
