import { authForwardHeaders, BACKEND_URL, readBackendJson } from "@/app/api/_utils/backend";
import { NextRequest, NextResponse } from "next/server";

const backendUrl = `${BACKEND_URL}/api/notification-preferences`;

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${backendUrl}${request.nextUrl.search}`, {
      headers: authForwardHeaders(request),
    });
    const body = await readBackendJson(response);
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("Notification preferences proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Could not reach backend for notification preferences.",
      },
      { status: 503 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = await request.json();
    const response = await fetch(backendUrl, {
      method: "PUT",
      headers: {
        ...authForwardHeaders(request),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await readBackendJson(response);
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("Notification preferences proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Could not reach backend for notification preferences.",
      },
      { status: 503 }
    );
  }
}
