import { getRequestConfig } from "next-intl/server";
import { DEFAULT_TIME_ZONE } from "@/constants/site";

export const LOCALES = ["en", "pt-BR", "es", "it"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_OPTIONS: { code: Locale; label: string; name: string }[] = [
  { code: "en", label: "EN", name: "English" },
  { code: "pt-BR", label: "PT", name: "Português" },
  { code: "es", label: "ES", name: "Español" },
  { code: "it", label: "IT", name: "Italiano" },
];

export function isValidLocale(locale: string | undefined): locale is Locale {
  return locale !== undefined && LOCALES.includes(locale as Locale);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isValidLocale(requested) ? requested : DEFAULT_LOCALE;

  // Dynamic import so the bundler emits one chunk per locale. Each route (e.g. /en, /pt-BR)
  // only loads its own messages; switching locale loads the other locale’s chunk on demand.
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    timeZone: DEFAULT_TIME_ZONE,
  };
});
