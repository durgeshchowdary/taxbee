import { NextRequest, NextResponse } from "next/server";
import { authForwardHeaders, BACKEND_URL, readBackendJson } from "@/app/api/_utils/backend";

const forward = async (
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST" | "PATCH"
) => {
  try {
    const { path } = await ctx.params;
    const body = method === "GET" ? undefined : JSON.stringify(await req.json().catch(() => ({})));
    const res = await fetch(
      `${BACKEND_URL}/api/collaboration/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`,
      {
        method,
        headers: {
          ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
          ...authForwardHeaders(req),
        },
        body,
      }
    );

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("Collaboration proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable.", data: null },
      { status: 503 }
    );
  }
};

export const GET = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx, "GET");

export const POST = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx, "POST");

export const PATCH = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) =>
  forward(req, ctx, "PATCH");
