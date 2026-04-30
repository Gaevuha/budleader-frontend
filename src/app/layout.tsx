import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/store/providers";
import { AuthProvider } from "@/providers/AuthProvider";
import { AppChrome } from "@/components/layout/AppChrome/AppChrome";
import { getCategories, getUser } from "@/services/apiServer";
import {
  buildGuestThemeBootstrapScript,
  DEFAULT_THEME_MODE,
} from "@/services/themePreference";
import type { Category } from "@/types/category";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  const resolvedLayoutCategories =
    layoutCategories.length > 0 ? layoutCategories : staticLayoutCategories;

  return (
    <html lang="uk" data-theme={initialTheme} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {buildGuestThemeBootstrapScript(initialTheme)}
        </Script>
        <Providers initialTheme={initialTheme} initialUser={initialUser}>
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
