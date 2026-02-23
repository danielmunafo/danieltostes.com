import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import {
  LINKEDIN_PROFILE_URL,
  META_DESCRIPTION,
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

const OG_IMAGE_PATH = "/og-image.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: META_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: META_DESCRIPTION,
  authors: [{ name: SITE_AUTHOR_DISPLAY_NAME, url: LINKEDIN_PROFILE_URL }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    type: "website",
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_AUTHOR_DISPLAY_NAME,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: META_TITLE,
        type: "image/png",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [OG_IMAGE_PATH],
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
