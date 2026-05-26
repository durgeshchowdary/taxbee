import { NextRequest, NextResponse } from "next/server";
import { authForwardHeaders, BACKEND_URL } from "@/app/api/_utils/backend";

const readJson = async (res: Response) => {
  const text = await res.text();
  if (!text) return { message: "Backend returned an empty response." };
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text.slice(0, 300) };
  }
};

const headersFor = (req: NextRequest) => ({
  "Content-Type": "application/json",
  ...authForwardHeaders(req),
});

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/deductions${req.nextUrl.search}`, {
      headers: headersFor(req),
    });
    return NextResponse.json(await readJson(res), { status: res.status });
  } catch (error) {
    console.error("Deductions load proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable.", data: null },
      { status: 503 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/deductions${req.nextUrl.search}`, {
      method: "PUT",
      headers: headersFor(req),
      body: JSON.stringify(body),
    });
    return NextResponse.json(await readJson(res), { status: res.status });
  } catch (error) {
    console.error("Deductions save proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Backend is not reachable.", data: null },
      { status: 503 }
    );
  }
}
