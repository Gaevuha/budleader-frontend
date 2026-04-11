import { NextRequest, NextResponse } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

const normalizeApiBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.replace(/\/api$/i, "");
};

const BACKEND_BASE_URL = normalizeApiBaseUrl(
  process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
);
const BACKEND_AUTH_BASE_URL = `${BACKEND_BASE_URL}/api/auth`;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const COOKIE_HEADER_NAME = "set-cookie";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const OAUTH_AUTHORIZE_HOSTS = new Set([
  "accounts.google.com",
  "www.facebook.com",
  "facebook.com",
]);

const AUTH_COOKIE_NAMES = new Set(["accessToken", "refreshToken", "sessionId"]);

const buildBackendAuthUrl = (
  pathSegments: string[],
  searchParams: URLSearchParams
): string => {
  const path = pathSegments.join("/");
  const search = searchParams.toString();
  const baseUrl = path
    ? `${BACKEND_AUTH_BASE_URL}/${path}`
    : BACKEND_AUTH_BASE_URL;

  return search ? `${baseUrl}?${search}` : baseUrl;
};

const buildAbsoluteRedirectLocation = (location: string): string => {
  if (/^https?:\/\//i.test(location)) {
    return location;
  }

  return new URL(location, BACKEND_BASE_URL).toString();
};

const splitMergedSetCookie = (value: string): string[] => {
  return value.split(/,(?=\s*[^=;,\s]+=[^;]+)/g).map((item) => item.trim());
};

const getSetCookieHeaders = (upstream: Response): string[] => {
  const upstreamHeaders = upstream.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const directCookies = upstreamHeaders.getSetCookie?.();

  if (directCookies && directCookies.length > 0) {
    return directCookies;
  }

  const mergedCookies = upstream.headers.get(COOKIE_HEADER_NAME);
  return mergedCookies ? splitMergedSetCookie(mergedCookies) : [];
};

const parseSameSite = (
  value: string | undefined
): ResponseCookie["sameSite"] => {
  if (!value) {
    return undefined;
  }

  switch (value.trim().toLowerCase()) {
    case "lax":
      return "lax";
    case "strict":
      return "strict";
    case "none":
      return "none";
    default:
      return undefined;
  }
};

const parseSetCookie = (headerValue: string): ResponseCookie | null => {
  const parts = headerValue.split(";").map((part) => part.trim());
  const [nameValue, ...attributes] = parts;

  if (!nameValue) {
    return null;
  }

  const separatorIndex = nameValue.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const name = nameValue.slice(0, separatorIndex).trim();
  const value = nameValue.slice(separatorIndex + 1);

  if (!name) {
    return null;
  }

  const cookie: ResponseCookie = {
    name,
    value,
    path: "/",
    httpOnly: AUTH_COOKIE_NAMES.has(name),
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "none" : "lax",
  };

  for (const attribute of attributes) {
    const [rawKey, ...rawValueParts] = attribute.split("=");
    const key = rawKey.trim().toLowerCase();
    const rawValue = rawValueParts.join("=").trim();

    switch (key) {
      case "path":
        cookie.path = "/";
        break;
      case "max-age": {
        const maxAge = Number.parseInt(rawValue, 10);
        if (Number.isFinite(maxAge)) {
          cookie.maxAge = maxAge;
        }
        break;
      }
      case "expires": {
        const expires = new Date(rawValue);
        if (!Number.isNaN(expires.getTime())) {
          cookie.expires = expires;
        }
        break;
      }
      case "httponly":
        cookie.httpOnly = true;
        break;
      case "secure":
        cookie.secure = true;
        break;
      case "samesite":
        cookie.sameSite = parseSameSite(rawValue) ?? cookie.sameSite;
        break;
      default:
        break;
    }
  }

  return cookie;
};

const applyUpstreamCookies = (response: NextResponse, upstream: Response) => {
  for (const headerValue of getSetCookieHeaders(upstream)) {
    const cookie = parseSetCookie(headerValue);

    if (!cookie) {
      continue;
    }

    response.cookies.set(cookie);
  }
};

const toForwardHeaders = (request: NextRequest): Headers => {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lower)) {
      return;
    }

    headers.set(key, value);
  });

  headers.set(
    "x-forwarded-host",
    request.headers.get("host") ?? request.nextUrl.host
  );
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(/:$/, ""));
  headers.set("x-forwarded-port", request.nextUrl.port || "");

  return headers;
};

const rewriteOAuthAuthorizeRedirect = (
  location: string,
  request: NextRequest
): string => {
  let redirectUrl: URL;

  try {
    redirectUrl = new URL(buildAbsoluteRedirectLocation(location));
  } catch {
    return buildAbsoluteRedirectLocation(location);
  }

  if (!OAUTH_AUTHORIZE_HOSTS.has(redirectUrl.hostname)) {
    return redirectUrl.toString();
  }

  const redirectUri = redirectUrl.searchParams.get("redirect_uri");

  if (!redirectUri) {
    return redirectUrl.toString();
  }

  const normalizedPathname = request.nextUrl.pathname.replace(/\/+$/, "");
  const callbackPath = normalizedPathname.endsWith("/callback")
    ? normalizedPathname
    : `${normalizedPathname}/callback`;
  redirectUrl.searchParams.set(
    "redirect_uri",
    `${request.nextUrl.origin}${callbackPath}`
  );

  return redirectUrl.toString();
};

const buildNextResponse = async (
  upstream: Response,
  request: NextRequest
): Promise<NextResponse> => {
  const headers = new Headers();

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lower) || lower === COOKIE_HEADER_NAME) {
      return;
    }

    headers.set(key, value);
  });

  const location = upstream.headers.get("location");

  if (location && upstream.status >= 300 && upstream.status < 400) {
    headers.set("location", rewriteOAuthAuthorizeRedirect(location, request));

    const response = new NextResponse(null, {
      status: upstream.status,
      headers,
    });

    applyUpstreamCookies(response, upstream);
    return response;
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const body =
    contentType.includes("application/json") || contentType.startsWith("text/")
      ? await upstream.text()
      : await upstream.arrayBuffer();

  const response = new NextResponse(body, {
    status: upstream.status,
    headers,
  });

  applyUpstreamCookies(response, upstream);
  return response;
};

export const proxyAuthRequest = async (
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> => {
  try {
    const targetUrl = buildBackendAuthUrl(
      pathSegments,
      request.nextUrl.searchParams
    );
    const method = request.method.toUpperCase();
    const body =
      method === "GET" || method === "HEAD"
        ? undefined
        : await request.arrayBuffer();

    const upstream = await fetch(targetUrl, {
      method,
      headers: toForwardHeaders(request),
      body,
      redirect: "manual",
      cache: "no-store",
    });

    return buildNextResponse(upstream, request);
  } catch (error) {
    console.error("[api/auth] request failed", {
      method: request.method,
      url: request.nextUrl.pathname,
      search: request.nextUrl.search,
      error,
    });

    return NextResponse.json(
      {
        success: false,
        message: "Auth proxy request failed",
      },
      { status: 500 }
    );
  }
};
