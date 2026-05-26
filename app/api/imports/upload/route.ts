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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/imports/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authForwardHeaders(req),
      },
      body: JSON.stringify(body),
    });

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("Document upload proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable. Document was not processed." },
      { status: 503 }
    );
  }
}
