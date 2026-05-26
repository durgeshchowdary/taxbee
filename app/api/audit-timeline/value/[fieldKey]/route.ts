import { NextRequest, NextResponse } from "next/server";
import { authForwardHeaders, BACKEND_URL, readBackendJson } from "@/app/api/_utils/backend";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ fieldKey: string }> }
) {
  try {
    const { fieldKey } = await ctx.params;
    const res = await fetch(
      `${BACKEND_URL}/api/audit-timeline/value/${encodeURIComponent(fieldKey)}${req.nextUrl.search}`,
      {
        headers: authForwardHeaders(req),
      }
    );

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("Value audit timeline proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable.", data: { events: [] } },
      { status: 503 }
    );
  }
}
