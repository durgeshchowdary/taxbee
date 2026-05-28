import type { NextRequest } from "next/server";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";

const isBearerHeader = (value: string) => /^Bearer\s+\S+$/i.test(value.trim());
const isJwtLike = (value: string) => /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value.trim());

export const authForwardHeaders = (req: NextRequest): Record<string, string> => {
  const cookieToken = req.cookies.get("auth_token")?.value;
  if (cookieToken && isJwtLike(cookieToken)) return { Authorization: `Bearer ${cookieToken}` };

  const authorization = req.headers.get("authorization");
  if (authorization && isBearerHeader(authorization)) {
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (isJwtLike(token)) return { Authorization: `Bearer ${token}` };
  }

  return {};
};

export const readBackendJson = async (res: Response) => {
  const text = await res.text();
  if (!text) return { message: "Backend returned an empty response." };

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text.slice(0, 300) };
  }
};

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24,
};

export const clearAuthCookieOptions = {
  ...authCookieOptions,
  maxAge: 0,
  expires: new Date(0),
};

export const shouldClearAuthCookie = (status: number, body: Record<string, unknown>) => {
  const code = body.code || (body.data as { code?: unknown } | undefined)?.code;
  return status === 401 || code === "AUTH_INVALID" || code === "EMAIL_VERIFICATION_REQUIRED";
};
