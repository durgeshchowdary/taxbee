import type { NextRequest } from "next/server";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:5000";

export const authForwardHeaders = (req: NextRequest): Record<string, string> => {
  const authorization = req.headers.get("authorization");
  if (authorization) return { Authorization: authorization };

  const cookieToken = req.cookies.get("auth_token")?.value;
  if (cookieToken) return { Authorization: `Bearer ${cookieToken}` };

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
