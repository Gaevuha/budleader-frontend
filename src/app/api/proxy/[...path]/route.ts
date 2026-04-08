import { NextRequest, NextResponse } from "next/server";

const normalizeApiBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.replace(/\/api$/i, "");
};

const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
);

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

const COOKIE_HEADER_NAME = "set-cookie";

const OAUTH_AUTHORIZE_HOSTS = new Set([
  "accounts.google.com",
  "www.facebook.com",
  "facebook.com",
]);

const buildTargetUrl = (
  pathParts: string[],
  searchParams: URLSearchParams
): string => {
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = pathParts.join("/");
  const search = searchParams.toString();

  return search ? `${base}/${path}?${search}` : `${base}/${path}`;
};

const buildRedirectLocation = (location: string): string => {
  if (/^https?:\/\//i.test(location)) {
    return location;
  }

  return new URL(location, API_BASE_URL).toString();
};

const buildProxyExternalBaseUrl = (request: NextRequest): string => {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0];
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0];
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // Fall back to forwarded headers or request URL.
    }
  }

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto.trim()}://${forwardedHost.trim()}`;
  }

  return request.nextUrl.origin;
};

const rewriteOAuthAuthorizeRedirect = (
  location: string,
  request: NextRequest
): string => {
  let redirectUrl: URL;

  try {
    redirectUrl = new URL(buildRedirectLocation(location));
  } catch {
    return buildRedirectLocation(location);
  }

  if (!OAUTH_AUTHORIZE_HOSTS.has(redirectUrl.hostname)) {
    return redirectUrl.toString();
  }

  const redirectUri = redirectUrl.searchParams.get("redirect_uri");

  if (!redirectUri) {
    return redirectUrl.toString();
  }

  const proxyExternalBaseUrl = buildProxyExternalBaseUrl(request);
  const callbackPath =
    request.nextUrl.pathname.replace(/\/+$/, "") + "/callback";

  redirectUrl.searchParams.set(
    "redirect_uri",
    `${proxyExternalBaseUrl}${callbackPath}`
  );

  return redirectUrl.toString();
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

const buildClientResponse = async (
  upstream: Response,
  request: NextRequest
): Promise<NextResponse> => {
  const headers = new Headers();
  const upstreamHeaders = upstream.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const rewriteSetCookiePath = (value: string): string => {
    return value.replace(
      /(;\s*Path=)(\/api(?:\/[^;]*)?)/i,
      (_, prefix, path) => {
        if (typeof path !== "string" || path.startsWith("/api/proxy/")) {
          return `${prefix}${path}`;
        }

        return `${prefix}/api/proxy${path}`;
      }
    );
  };

  const splitMergedSetCookie = (value: string): string[] => {
    return value.split(/,(?=\s*[^=;,\s]+=[^;]+)/g).map((item) => item.trim());
  };

  const setCookies =
    upstreamHeaders.getSetCookie?.() ??
    (upstream.headers.get(COOKIE_HEADER_NAME)
      ? splitMergedSetCookie(upstream.headers.get(COOKIE_HEADER_NAME) ?? "")
      : []);

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lower) || lower === COOKIE_HEADER_NAME) {
      return;
    }

    headers.set(key, value);
  });

  for (const cookie of setCookies) {
    headers.append(COOKIE_HEADER_NAME, rewriteSetCookiePath(cookie));
  }

  const location = upstream.headers.get("location");

  if (location && upstream.status >= 300 && upstream.status < 400) {
    headers.set("location", rewriteOAuthAuthorizeRedirect(location, request));

    return new NextResponse(null, {
      status: upstream.status,
      headers,
    });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const body =
    contentType.includes("application/json") || contentType.startsWith("text/")
      ? await upstream.text()
      : await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: upstream.status,
    headers,
  });
};

const proxyRequest = async (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> => {
  try {
    const { path } = await context.params;
    const targetUrl = buildTargetUrl(path, request.nextUrl.searchParams);
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
    });

    return buildClientResponse(upstream, request);
  } catch (error) {
    console.error("[api/proxy] request failed", {
      method: request.method,
      url: request.nextUrl.pathname,
      search: request.nextUrl.search,
      error,
    });

    return NextResponse.json(
      {
        success: false,
        message: "Proxy request failed",
      },
      { status: 500 }
    );
  }
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  return proxyRequest(request, context);
}
