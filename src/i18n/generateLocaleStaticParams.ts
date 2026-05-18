import { LOCALES } from "@/i18n/request";

/** Pre-render targets for `[locale]` routes (`output: "export"` and dev param validation). */
export function generateLocaleStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
