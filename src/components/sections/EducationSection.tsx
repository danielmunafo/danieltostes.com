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
  const eduBlock = t.raw("eduBlock") as { title: string; edu: EduItem[] };
  const coursesBlock = t.raw("coursesBlock") as {
    title: string;
    courses: CourseItem[];
  };
  const languagesBlock = t.raw("languagesBlock") as {
    title: string;
    languages: LanguageItem[];
  };
  const permitsBlock = t.raw("permitsBlock") as {
    title: string;
    permits: string[];
  };

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t("title")}
      </Typography>

      <Box id="section-education-item-0">
        <SectionItem
          sectionId={SECTION_ID}
          side={getItemSide(SECTION_ID, 0)}
          iconSrc="/cps.png"
          iconAlt="CPS"
          compact
        >
          {eduBlock.edu.map((item, i) => (
            <Box key={i} sx={{ mb: i < eduBlock.edu.length - 1 ? 2 : 0 }}>
              <Typography variant="h3" component="h3" sx={{ fontWeight: 600 }}>
                {item.degree}
              </Typography>
              <Typography
                component="p"
                variant="subtitle1"
                sx={{ opacity: 0.8 }}
              >
                {item.institution}
              </Typography>
            </Box>
          ))}
        </SectionItem>
      </Box>

      <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />

      <Box id="section-education-item-1">
        <SectionItem
          sectionId={SECTION_ID}
          side={getItemSide(SECTION_ID, 1)}
          iconSrc="/aws.svg"
          iconAlt="AWS"
          compact
        >
          <Typography variant="h3" gutterBottom>
            {coursesBlock.title}
          </Typography>
          {coursesBlock.courses.map((item, i) => (
            <Typography key={i} variant="body1" sx={{ mb: 1 }}>
              {item.name} &mdash; {item.provider}
            </Typography>
          ))}
        </SectionItem>
      </Box>

      <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />

      <Box id="section-education-item-2">
        <SectionItem
          sectionId={SECTION_ID}
          side={getItemSide(SECTION_ID, 2)}
          compact
        >
          <Typography variant="h3" gutterBottom>
            {languagesBlock.title}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {languagesBlock.languages.map((lang, i) => (
              <Chip
                key={i}
                label={`${lang.name} — ${lang.level}`}
                sx={{ backgroundColor: chipBg, color: "inherit" }}
              />
            ))}
          </Box>
        </SectionItem>
      </Box>

      <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />

      <Box id="section-education-item-3">
        <SectionItem
          sectionId={SECTION_ID}
          side={getItemSide(SECTION_ID, 3)}
          compact
        >
          <Typography variant="h3" gutterBottom>
            {permitsBlock.title}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {permitsBlock.permits.map((label, i) => (
              <Chip
                key={i}
                label={label}
                sx={{ backgroundColor: chipBg, color: "inherit" }}
              />
            ))}
          </Box>
        </SectionItem>
      </Box>
    </Box>
  );
}
