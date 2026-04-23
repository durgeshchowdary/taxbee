import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";

const readBackendJson = async (res: Response) => {
  const text = await res.text();

  if (!text) {
    return { draft: null };
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text.slice(0, 300) };
  }
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ userKey: string }> }
) {
  try {
    const { userKey } = await ctx.params;
    const res = await fetch(
      `${BACKEND_URL}/api/itr-draft/${encodeURIComponent(userKey)}`
    );

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("ITR draft load proxy error:", error);
    return NextResponse.json({ draft: null }, { status: 200 });
  }
}
