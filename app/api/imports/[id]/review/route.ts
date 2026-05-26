import { NextRequest, NextResponse } from "next/server";
import { authForwardHeaders, BACKEND_URL, readBackendJson } from "@/app/api/_utils/backend";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/imports/${encodeURIComponent(id)}/review${req.nextUrl.search}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authForwardHeaders(req),
      },
      body: JSON.stringify(body),
    });

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("Import review proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable. Review was not saved." },
      { status: 503 }
    );
  }
}
