"use client";

import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { CHIP_BG, getItemSide } from "@/constants/sections";
import { SectionItem } from "./SectionItem";

const SECTION_ID = "education" as const;

type EduItem = { degree: string; institution: string };
type CourseItem = { name: string; provider: string };
type LanguageItem = { name: string; level: string };

export function EducationSection() {
  const t = useTranslations("Education");
  const { palette } = useTheme();
  const chipBg = CHIP_BG[palette.mode];
  const edu = t.raw("edu") as EduItem[];
  const courses = t.raw("courses") as CourseItem[];
  const languages = t.raw("languages") as LanguageItem[];
  const permits = t.raw("permits") as string[];

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t("title")}
      </Typography>

      <SectionItem
        sectionId={SECTION_ID}
        side={getItemSide(SECTION_ID, 0)}
        iconSrc="/cps.png"
        iconAlt="CPS"
        compact
      >
        {edu.map((item, i) => (
          <Box key={i} sx={{ mb: i < edu.length - 1 ? 2 : 0 }}>
            <Typography variant="h3" component="h3" sx={{ fontWeight: 600 }}>
              {item.degree}
            </Typography>
            <Typography component="p" variant="subtitle1" sx={{ opacity: 0.8 }}>
              {item.institution}
            </Typography>
          </Box>
        ))}
      </SectionItem>

      <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />

      <SectionItem
        sectionId={SECTION_ID}
        side={getItemSide(SECTION_ID, 1)}
        iconSrc="/aws.svg"
        iconAlt="AWS"
        iconScale={0.8}
        compact
      >
        <Typography variant="h3" gutterBottom>
          {t("coursesTitle")}
        </Typography>
        {courses.map((item, i) => (
          <Typography key={i} variant="body1" sx={{ mb: 1 }}>
            {item.name} &mdash; {item.provider}
          </Typography>
        ))}
      </SectionItem>

      <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />

      <SectionItem
        sectionId={SECTION_ID}
        side={getItemSide(SECTION_ID, 2)}
        compact
      >
        <Typography variant="h3" gutterBottom>
          {t("languagesTitle")}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {languages.map((lang, i) => (
            <Chip
              key={i}
              label={`${lang.name} — ${lang.level}`}
              sx={{ backgroundColor: chipBg, color: "inherit" }}
            />
          ))}
        </Box>
      </SectionItem>

      <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />

      <SectionItem
        sectionId={SECTION_ID}
        side={getItemSide(SECTION_ID, 3)}
        compact
      >
        <Typography variant="h3" gutterBottom>
          {t("workPermitsTitle")}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {permits.map((label, i) => (
            <Chip
              key={i}
              label={label}
              sx={{ backgroundColor: chipBg, color: "inherit" }}
            />
          ))}
        </Box>
      </SectionItem>
    </Box>
  );
}
