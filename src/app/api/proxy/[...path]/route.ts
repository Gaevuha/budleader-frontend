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

const buildTargetUrl = (
  pathParts: string[],
  searchParams: URLSearchParams
): string => {
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = pathParts.join("/");
  const search = searchParams.toString();

  return search ? `${base}/${path}?${search}` : `${base}/${path}`;
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

  return headers;
};

const buildClientResponse = async (
  upstream: Response
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
    });

    return buildClientResponse(upstream);
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
