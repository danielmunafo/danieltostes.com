import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AppProviders } from "@/components/AppProviders";
import { LocaleRuntimeProvider } from "@/contexts/LocaleRuntimeContext";
import { isValidLocale, LOCALES } from "@/i18n/request";

/** Next.js calls this at build time to pre-render each [locale] segment (no in-repo references). */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <LocaleRuntimeProvider initialLocale={locale} initialMessages={messages}>
      <AppProviders>
        <div lang={locale}>{children}</div>
      </AppProviders>
    </LocaleRuntimeProvider>
  );
}
