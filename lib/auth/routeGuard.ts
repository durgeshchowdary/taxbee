import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_LIKE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export const PROTECTED_ROUTE_PREFIXES = [
  "/audit-timeline",
  "/admin",
  "/collaboration",
  "/dashboard",
  "/deductions",
  "/documents",
  "/file-tax",
  "/file-your-itr",
  "/import-data",
  "/income-details",
  "/reviewer",
  "/tax-savings",
  "/upload-documents",
] as const;

export const PROTECTED_ROUTE_MATCHER = PROTECTED_ROUTE_PREFIXES.map((prefix) => `${prefix}/:path*`);

const clearAuthCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
  expires: new Date(0),
};

type JwtPayload = {
  id?: unknown;
  exp?: unknown;
  isVerified?: unknown;
};

export const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const normalized = token.trim();
    if (!JWT_LIKE.test(normalized)) return null;

    const [, payloadSegment] = normalized.split(".");
    if (!payloadSegment) return null;

    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
};

export const isSessionTokenValid = (token: string) => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.id !== "string" || !payload.id.trim()) return false;

  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
    return false;
  }

  return true;
};

export const isExplicitlyUnverifiedToken = (token: string) => {
  const payload = decodeJwtPayload(token);
  return payload?.isVerified === false;
};

export const isProtectedRoute = (pathname: string) =>
  PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const redirectWithClearedAuth = (request: NextRequest, pathname: string) => {
  const response = NextResponse.redirect(new URL(pathname, request.url));
  response.cookies.set("auth_token", "", clearAuthCookieOptions);
  return response;
};

export const handleProtectedRoute = (request: NextRequest) => {
  if (!isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value?.trim() || "";

  if (!token || !isSessionTokenValid(token)) {
    return redirectWithClearedAuth(request, "/login");
  }

  if (isExplicitlyUnverifiedToken(token)) {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  return NextResponse.next();
};

