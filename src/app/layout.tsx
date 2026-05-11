import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { dehydrate } from "@tanstack/react-query";

import "./globals.css";
import { Providers } from "@/store/providers";
import { USER_QUERY_KEY } from "@/queries/queryKeys";
import { AuthProvider } from "@/providers/AuthProvider";
import { AppChrome } from "@/components/layout/AppChrome/AppChrome";
import { getCategories, getUser } from "@/services/apiServer";
import { createQueryClient } from "@/store/queryClient";
import {
  buildGuestThemeBootstrapScript,
  DEFAULT_THEME_MODE,
} from "@/services/themePreference";
import type { Category } from "@/types/category";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const resolveMetadataBaseUrl = (): URL => {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_BRANCH_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";

  const normalizedUrl = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `https://${rawUrl}`;

  return new URL(normalizedUrl);
};

const metadataBase = resolveMetadataBaseUrl();

const socialDescription =
  "Каталог будівельних матеріалів та послуг для ремонту, комплектації і доставки.";

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Будлідер",
    template: "%s | Будлідер",
  },
  description:
    "Будівельні матеріали, інструменти, сантехніка, електротовари та послуги для ремонту й будівництва.",
  applicationName: "Будлідер",
  keywords: [
    "Будлідер",
    "будівельні матеріали",
    "інструменти",
    "сантехніка",
    "електротовари",
    "доставка будматеріалів",
  ],
  openGraph: {
    title: "Будлідер",
    description: socialDescription,
    siteName: "Будлідер",
    locale: "uk_UA",
    type: "website",
    url: metadataBase,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Будлідер - будівельні матеріали та послуги",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Будлідер",
    description: socialDescription,
    images: ["/twitter-image"],
  },
};

const staticLayoutCategories: Category[] = [
  { id: "building-materials", name: "Будівельні матеріали", subcategories: [] },
  { id: "tools", name: "Інструменти", subcategories: [] },
  { id: "plumbing", name: "Сантехніка", subcategories: [] },
  { id: "electro", name: "Електротовари", subcategories: [] },
];

const buildPerformanceBootstrapScript = () => `
(() => {
  if (typeof window === "undefined" || typeof performance === "undefined") {
    return;
  }

  const perfState = window.__blPerf || {};
  window.__blPerf = perfState;

  if (typeof perfState.bootStart !== "number") {
    perfState.bootStart = performance.now();
    performance.mark("app:boot:start");
    console.debug("[perf] client boot start", {
      ms: Math.round(perfState.bootStart),
      path: window.location.pathname,
    });
  }

  const navigationEntries = performance.getEntriesByType("navigation");
  const navigationTiming = navigationEntries && navigationEntries.length > 0
    ? navigationEntries[0]
    : null;

  if (navigationTiming && typeof navigationTiming.responseStart === "number") {
    console.debug("[perf] ttfb", {
      ms: Math.round(navigationTiming.responseStart),
      path: window.location.pathname,
    });
  }

  if ("PerformanceObserver" in window) {
    let lcpObserver = null;

    try {
      lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        if (!entries || entries.length === 0) {
          return;
        }

        const latestEntry = entries[entries.length - 1];
        const lcpEntry = latestEntry;

        performance.mark("app:lcp:candidate");
        console.debug("[perf] lcp candidate", {
          ms: Math.round(lcpEntry.startTime),
          size: Number.isFinite(lcpEntry.size) ? lcpEntry.size : null,
          url: lcpEntry.url || null,
          path: window.location.pathname,
        });
      });

      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

      const stopLcpObserver = () => {
        if (!lcpObserver) {
          return;
        }

        lcpObserver.disconnect();
        lcpObserver = null;
      };

      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          stopLcpObserver();
        }
      }, { once: true });

      window.addEventListener("pagehide", stopLcpObserver, { once: true });
    } catch {
      // Intentionally ignore observer setup issues in older browsers.
    }
  }
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialTheme = DEFAULT_THEME_MODE;
  const [initialUser, layoutCategories] = await Promise.all([
    getUser(),
    getCategories(),
  ]);
  const queryClient = createQueryClient();
  queryClient.setQueryData(USER_QUERY_KEY, initialUser);
  const dehydratedState = dehydrate(queryClient);
  const resolvedLayoutCategories =
    layoutCategories.length > 0 ? layoutCategories : staticLayoutCategories;

  return (
    <html lang="uk" data-theme={initialTheme} suppressHydrationWarning>
      <body className={geistSans.variable}>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {buildGuestThemeBootstrapScript(initialTheme)}
        </Script>
        <Script id="performance-bootstrap" strategy="beforeInteractive">
          {buildPerformanceBootstrapScript()}
        </Script>
        <Providers
          initialTheme={initialTheme}
          initialUser={initialUser}
          dehydratedState={dehydratedState}
        >
          <AuthProvider initialUser={initialUser}>
            <AppChrome
              categories={resolvedLayoutCategories}
              initialTheme={initialTheme}
            >
              {children}
            </AppChrome>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
