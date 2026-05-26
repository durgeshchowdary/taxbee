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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const res = await fetch(`${BACKEND_URL}/api/jobs/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: authForwardHeaders(req),
    });

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Backend is not reachable. Job status was not fetched." },
      { status: 503 }
    );
  }
}
