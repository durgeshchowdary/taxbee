import { authForwardHeaders, BACKEND_URL, readBackendJson } from "@/app/api/_utils/backend";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/session`, {
      headers: {
        ...authForwardHeaders(request),
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