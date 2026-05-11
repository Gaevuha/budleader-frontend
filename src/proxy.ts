import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PREFIX = "/admin";
const PROFILE_ROUTES = ["/profile", "/orders"];
const HTML_CACHE_CONTROL = "private, max-age=0, must-revalidate";

const startsWithRoute = (pathname: string, route: string): boolean => {
  return pathname === route || pathname.startsWith(`${route}/`);
};

const isProfileRoute = (pathname: string): boolean => {
  return PROFILE_ROUTES.some((route) => startsWithRoute(pathname, route));
};

const isAdminRoute = (pathname: string): boolean => {
  return startsWithRoute(pathname, ADMIN_PREFIX);
};

const isHtmlDocumentRequest = (req: NextRequest): boolean => {
  const secFetchDest = req.headers.get("sec-fetch-dest");

  if (secFetchDest === "document") {
    return true;
  }

  const accept = req.headers.get("accept") ?? "";

  return accept.includes("text/html");
};

const withHtmlCacheHeaders = (
  req: NextRequest,
  response: NextResponse
): NextResponse => {
  if (isHtmlDocumentRequest(req)) {
    response.headers.set("Cache-Control", HTML_CACHE_CONTROL);
  }

  return response;
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("accessToken")?.value;

  if (!accessToken) {
    if (isAdminRoute(pathname) || isProfileRoute(pathname)) {
      return withHtmlCacheHeaders(
        req,
        NextResponse.redirect(new URL("/login", req.url))
      );
    }

    return withHtmlCacheHeaders(req, NextResponse.next());
  }

  return withHtmlCacheHeaders(req, NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
