import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PREFIX = "/admin";
const PROFILE_ROUTES = ["/profile", "/orders"];

const startsWithRoute = (pathname: string, route: string): boolean => {
  return pathname === route || pathname.startsWith(`${route}/`);
};

const isProfileRoute = (pathname: string): boolean => {
  return PROFILE_ROUTES.some((route) => startsWithRoute(pathname, route));
};

const isAdminRoute = (pathname: string): boolean => {
  return startsWithRoute(pathname, ADMIN_PREFIX);
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("accessToken")?.value;

  if (!accessToken) {
    if (isAdminRoute(pathname) || isProfileRoute(pathname)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
