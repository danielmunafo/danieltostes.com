import { getMessages, setRequestLocale } from "next-intl/server";
import { AppProviders } from "@/components/AppProviders";
import { LocaleRuntimeProvider } from "@/contexts/LocaleRuntimeContext";
import { type Locale, LOCALES } from "@/i18n/request";

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
  const localeValid = locale as Locale;
  setRequestLocale(localeValid);
  const messages = await getMessages({ locale: localeValid });

  return (
    <LocaleRuntimeProvider
      initialLocale={localeValid}
      initialMessages={messages}
    >
      <AppProviders>{children}</AppProviders>
    </LocaleRuntimeProvider>
  );
}
