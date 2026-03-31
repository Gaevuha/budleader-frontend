import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];
const ADMIN_PREFIX = "/admin";
const PROFILE_ROUTES = ["/profile", "/orders"];
const SHARED_PUBLIC_ROUTES = ["/cart", "/wishlist"];
const CHECKOUT_ROUTE = "/checkout";

const startsWithRoute = (pathname: string, route: string): boolean => {
  return pathname === route || pathname.startsWith(`${route}/`);
};

const isAuthRoute = (pathname: string): boolean => {
  return AUTH_ROUTES.some((route) => startsWithRoute(pathname, route));
};

const isProfileRoute = (pathname: string): boolean => {
  return PROFILE_ROUTES.some((route) => startsWithRoute(pathname, route));
};

const isAdminRoute = (pathname: string): boolean => {
  return startsWithRoute(pathname, ADMIN_PREFIX);
};

const isSharedPublicRoute = (pathname: string): boolean => {
  return SHARED_PUBLIC_ROUTES.some((route) => startsWithRoute(pathname, route));
};

const isCheckoutRoute = (pathname: string): boolean => {
  return startsWithRoute(pathname, CHECKOUT_ROUTE);
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("accessToken")?.value;
  const role = req.cookies.get("role")?.value;

  if (isAuthRoute(pathname) && accessToken) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    return NextResponse.redirect(new URL("/profile", req.url));
  }

  if (!accessToken) {
    if (isCheckoutRoute(pathname)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (isAdminRoute(pathname) || isProfileRoute(pathname)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  if (role === "admin") {
    if (
      !isAdminRoute(pathname) &&
      !isSharedPublicRoute(pathname) &&
      !isCheckoutRoute(pathname)
    ) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    return NextResponse.next();
  }

  if (role === "user" && isAdminRoute(pathname)) {
    return NextResponse.redirect(new URL("/profile", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
