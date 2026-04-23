import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";

const readBackendJson = async (res: Response) => {
  const text = await res.text();

  if (!text) {
    return { message: "Backend returned an empty response." };
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text.slice(0, 300) };
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/itr-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("ITR draft save proxy error:", error);
    return NextResponse.json(
      { message: "Backend is not reachable. Your draft is still saved locally." },
      { status: 503 }
    );
  }
}
