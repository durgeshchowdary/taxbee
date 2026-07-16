import type { NextRequest } from "next/server";
import { handleProtectedRoute, PROTECTED_ROUTE_MATCHER } from "@/lib/auth/routeGuard";

export function proxy(request: NextRequest) {
  return handleProtectedRoute(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/import-data/:path*",
    "/file-tax/:path*",
    "/file-your-itr/:path*",
    "/deductions/:path*",
    "/documents/:path*",
    "/income-details/:path*",
    "/tax-savings/:path*",
    "/audit-timeline/:path*",
    "/notifications/:path*",
    "/reviewer/:path*",
  ],
};
