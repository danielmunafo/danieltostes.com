import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RecruiterAssistantProfessionalContextPageClient } from "@/features/recruiter-assistant/components/RecruiterAssistantProfessionalContextPageClient";
import { isValidLocale, type Locale } from "@/i18n/request";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam } = await params;
  if (!isValidLocale(localeParam)) {
    return {};
  }
  const locale = localeParam as Locale;
  const t = await getTranslations({
    locale,
    namespace: "RecruiterAssistantProfessionalContext",
  });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function RecruiterAssistantProfessionalContextPage({
  params,
}: Props) {
  const { locale: localeParam } = await params;
  if (!isValidLocale(localeParam)) notFound();
  setRequestLocale(localeParam);
  return (
    <RecruiterAssistantProfessionalContextPageClient
      key={localeParam}
      locale={localeParam as Locale}
    />
  );
}
