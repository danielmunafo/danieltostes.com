"use client";

import type { Locale } from "@/i18n/request";
import { RecruiterAssistantMarkdownReadmePageClient } from "./RecruiterAssistantMarkdownReadmePageClient";

type RecruiterAssistantProfessionalContextPageClientProps = {
  readonly locale: Locale;
};

export function RecruiterAssistantProfessionalContextPageClient({
  locale,
}: RecruiterAssistantProfessionalContextPageClientProps) {
  return (
    <RecruiterAssistantMarkdownReadmePageClient
      locale={locale}
      contentUrl={(contentLocale) =>
        `/content/recruiter-assistant/professional-context/${contentLocale}.md`
      }
      i18nNamespace="RecruiterAssistantProfessionalContext"
      logTag="recruiter-professional-context"
      assignH2SectionAnchors
    />
  );
}
