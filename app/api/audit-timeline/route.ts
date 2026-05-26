import { NextRequest, NextResponse } from "next/server";
import { authForwardHeaders, BACKEND_URL } from "@/app/api/_utils/backend";

const readBackendJson = async (res: Response) => {
  const text = await res.text();
  if (!text) return { message: "Backend returned an empty response." };

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text.slice(0, 300) };
  }
};

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/audit-timeline${req.nextUrl.search}`, {
      headers: authForwardHeaders(req),
    });

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("Audit timeline proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable.", data: { events: [] } },
      { status: 503 }
    );
  }
}
