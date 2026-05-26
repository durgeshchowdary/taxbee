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

const authHeaders = (req: NextRequest) => ({
  "Content-Type": "application/json",
  ...authForwardHeaders(req),
});

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/imports${req.nextUrl.search}`, {
      headers: authHeaders(req),
    });

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("Import list proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable.", data: { imports: [] } },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/imports${req.nextUrl.search}`, {
      method: "POST",
      headers: authHeaders(req),
      body: JSON.stringify(body),
    });

    return NextResponse.json(await readBackendJson(res), { status: res.status });
  } catch (error) {
    console.error("Import save proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable. Import was not saved to your account." },
      { status: 503 }
    );
  }
}
