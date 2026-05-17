"use client";

import type { Locale } from "@/i18n/request";
import { RecruiterAssistantMarkdownReadmePageClient } from "./RecruiterAssistantMarkdownReadmePageClient";

type RecruiterAssistantTermsPageClientProps = {
  readonly locale: Locale;
};

export function RecruiterAssistantTermsPageClient({
  locale,
}: RecruiterAssistantTermsPageClientProps) {
  return (
    <RecruiterAssistantMarkdownReadmePageClient
      locale={locale}
      contentUrl={(contentLocale) =>
        `/content/recruiter-assistant/terms/${contentLocale}.md`
      }
      i18nNamespace="RecruiterAssistantTerms"
      logTag="recruiter-terms"
    />
  );
}
