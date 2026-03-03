"use client";

import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
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

type AboutParagraph = {
  title: string;
  body: string;
};

export function MeSection() {
  const t = useTranslations("Me");
  const paragraphs = t.raw("paragraphs") as AboutParagraph[];

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t("title")}
      </Typography>

      {paragraphs.map((paragraph, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === paragraphs.length - 1;

        return (
          <Box key={idx}>
            <SectionItem
              sectionId={SECTION_ID}
              side={getItemSide(SECTION_ID, idx)}
              {...(isFirst
                ? {
                    iconSrc: "/me.jpeg",
                    iconAlt: SITE_AUTHOR_DISPLAY_NAME,
                  }
                : {})}
            >
              <Typography variant="h3" component="h3" sx={{ fontWeight: 600 }}>
                {paragraph.title}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {paragraph.body}
              </Typography>
            </SectionItem>

            {!isLast && (
              <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />
            )}
          </Box>
        );
      })}

      <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />

      <SectionItem
        sectionId={SECTION_ID}
        side={getItemSide(SECTION_ID, paragraphs.length)}
      >
        <Typography variant="body1" sx={{ opacity: 0.85 }}>
          {t("connectNote")}
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 1.5 }}
          flexWrap="wrap"
          useFlexGap
        >
          <Link
            href={LINKEDIN_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("linkedinLabel")}
          </Link>
          <Link
            href={GITHUB_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("githubLabel")}
          </Link>
          <Link href={`mailto:${CONTACT_EMAIL}`}>{t("emailLabel")}</Link>
        </Stack>
      </SectionItem>
    </Box>
  );
}
