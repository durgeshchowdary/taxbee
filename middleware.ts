import type { NextRequest } from "next/server";
import { handleProtectedRoute } from "./lib/auth/routeGuard";

export const config = {
  matcher: [
    "/audit-timeline/:path*",
    "/admin/:path*",
    "/collaboration/:path*",
    "/dashboard/:path*",
    "/deductions/:path*",
    "/documents/:path*",
    "/file-tax/:path*",
    "/file-your-itr/:path*",
    "/import-data/:path*",
    "/income-details/:path*",
    "/reviewer/:path*",
    "/tax-savings/:path*",
    "/upload-documents/:path*",
  ],
};

export function middleware(request: NextRequest) {
  return handleProtectedRoute(request);
}
