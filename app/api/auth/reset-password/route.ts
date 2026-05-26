import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, readBackendJson } from "@/app/api/_utils/backend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("Reset password proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable. Password could not be reset." },
      { status: 503 }
    );
  }
}
