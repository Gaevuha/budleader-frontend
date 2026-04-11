import type { Metadata } from "next";
import { cookies } from "next/headers";
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
  resolveThemeFromCookieHeader,
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

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
);

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
  const cookieStore = await cookies();
  const [categories, currentUser] = await Promise.all([
    getCategories(),
    getUser(),
  ]);
  const guestTheme =
    resolveThemeFromCookieHeader(cookieStore.toString()) ?? DEFAULT_THEME_MODE;
  const initialTheme = currentUser
    ? currentUser.theme ?? DEFAULT_THEME_MODE
    : guestTheme;
  const resolvedCategories =
    categories.length === 0 ? staticLayoutCategories : categories;

  return (
    <html lang="uk" data-theme={initialTheme} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {!currentUser ? (
          <Script id="theme-bootstrap" strategy="beforeInteractive">
            {buildGuestThemeBootstrapScript(initialTheme)}
          </Script>
        ) : null}
        <Providers initialTheme={initialTheme} initialUser={currentUser}>
          <AuthProvider initialUser={currentUser}>
            <AppChrome
              categories={resolvedCategories}
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
