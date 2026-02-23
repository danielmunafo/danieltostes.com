import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import {
  META_DESCRIPTION,
  META_OG_TAGLINE,
  META_TITLE,
  SITE_AUTHOR_DISPLAY_NAME,
  SITE_NAME,
  SITE_URL,
} from "@/constants/site";
import { DEFAULT_LOCALE } from "@/i18n/request";
import "./globals.css";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: META_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: META_DESCRIPTION,
  icons: { icon: "/logo.svg" },
  openGraph: {
    type: "website",
    title: META_TITLE,
    description: META_OG_TAGLINE,
    url: SITE_URL,
    siteName: SITE_AUTHOR_DISPLAY_NAME,
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: META_TITLE },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_OG_TAGLINE,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <body className={roboto.variable} suppressHydrationWarning>
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}
