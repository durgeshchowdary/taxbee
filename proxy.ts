import type { NextRequest } from "next/server";
import { handleProtectedRoute, PROTECTED_ROUTE_MATCHER } from "@/lib/auth/routeGuard";

export function proxy(request: NextRequest) {
  return handleProtectedRoute(request);
}

export { PROTECTED_ROUTE_MATCHER as config };
