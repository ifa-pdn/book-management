import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, getAuthRoleFromToken } from './lib/auth';

const getSafeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
};

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const role = getAuthRoleFromToken(token);
  const { pathname } = request.nextUrl;

  const isAdminRoute =
    pathname.startsWith("/add") ||
    pathname.startsWith("/admin");
  const isInternalRoute =
    pathname === "/" ||
    pathname.startsWith("/books") ||
    pathname.startsWith("/copy");

  if (isAdminRoute) {
    if (!role) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set(
        "next",
        `${pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(loginUrl);
    }

    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (isInternalRoute && !role) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login page
  if (pathname === '/login' && role) {
    const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));
    const nextIsAdminRoute =
      nextPath.startsWith("/add") || nextPath.startsWith("/admin");

    return NextResponse.redirect(
      new URL(nextIsAdminRoute && role !== "admin" ? "/" : nextPath, request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/books/:path*', '/copy/:path*', '/add/:path*', '/admin/:path*', '/login'],
};
