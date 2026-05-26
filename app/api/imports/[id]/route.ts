import { NextRequest, NextResponse } from "next/server";
import { authForwardHeaders, BACKEND_URL, readBackendJson } from "@/app/api/_utils/backend";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const res = await fetch(`${BACKEND_URL}/api/imports/${encodeURIComponent(id)}${req.nextUrl.search}`, {
      method: "DELETE",
      headers: authForwardHeaders(req),
    });

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("Import delete proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable. Import was not removed." },
      { status: 503 }
    );
  }
}
