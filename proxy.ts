import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isExplicitlyUnverifiedToken = (token: string) => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return false;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = JSON.parse(atob(padded)) as {
      isVerified?: unknown;
    };
    return decoded.isVerified === false;
  } catch {
    return false;
  }
};

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  const protectedPrefixes = [
    '/audit-timeline',
    '/admin',
    '/collaboration',
    '/dashboard',
    '/deductions',
    '/documents',
    '/file-tax',
    '/file-your-itr',
    '/import-data',
    '/income-details',
    '/reviewer',
    '/tax-savings',
    '/upload-documents',
  ];
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isProtectedRoute && token && isExplicitlyUnverifiedToken(token)) {
    return NextResponse.redirect(new URL('/verify-email', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/audit-timeline/:path*',
    '/admin/:path*',
    '/collaboration/:path*',
    '/dashboard/:path*',
    '/deductions/:path*',
    '/documents/:path*',
    '/file-tax/:path*',
    '/file-your-itr/:path*',
    '/import-data/:path*',
    '/income-details/:path*',
    '/reviewer/:path*',
    '/tax-savings/:path*',
    '/upload-documents/:path*',
  ],
};
