"use client";

import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  CONTACT_EMAIL,
  GITHUB_PROFILE_URL,
  LINKEDIN_PROFILE_URL,
  SITE_AUTHOR_DISPLAY_NAME,
} from "@/constants/site";
import { getItemSide } from "@/constants/sections";
import { SectionItem } from "./SectionItem";

const SECTION_ID = "me" as const;

export function MeSection() {
  const t = useTranslations("Me");

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t("title")}
      </Typography>

      <SectionItem
        sectionId={SECTION_ID}
        side={getItemSide(SECTION_ID, 0)}
        iconSrc="/me.jpeg"
        iconAlt={SITE_AUTHOR_DISPLAY_NAME}
      >
        <Typography variant="body1" sx={{ opacity: 0.7 }}>
          {t("placeholder")}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
          <Link href={LINKEDIN_PROFILE_URL} target="_blank" rel="noopener noreferrer">
            {t("linkedinLabel")}
          </Link>
          <Link href={GITHUB_PROFILE_URL} target="_blank" rel="noopener noreferrer">
            {t("githubLabel")}
          </Link>
          <Link href={`mailto:${CONTACT_EMAIL}`}>{t("emailLabel")}</Link>
        </Stack>
      </SectionItem>
    </Box>
  );
}
