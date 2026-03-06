"use client";

import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { SITE_NAME } from "@/constants/site";
import { CHIP_BG, SUMMARY_SKILLS, getItemSide } from "@/constants/sections";
import { SectionItem } from "./SectionItem";

const SECTION_ID = "summary" as const;

export function SummarySection() {
  const t = useTranslations("Summary.hero");
  const { palette } = useTheme();
  const chipBg = CHIP_BG[palette.mode];

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t("title")}
      </Typography>

      <Box id="section-summary-item-0">
        <SectionItem
          sectionId={SECTION_ID}
          side={getItemSide(SECTION_ID, 0)}
          iconSrc="/logo.svg"
          iconAlt={SITE_NAME}
        >
          <Typography variant="body1" sx={{ mb: 3 }}>
            {t("description")}
          </Typography>

          <Box>
            <Box sx={{ mb: 1.5 }}>
              <Typography
                variant="subtitle1"
                component="span"
                sx={{ fontWeight: 600, mr: 1 }}
              >
                {t("experienceLabel")}:
              </Typography>
              <Typography component="span" variant="body1">
                {t("experienceValue")}
              </Typography>
            </Box>
            {SUMMARY_SKILLS.map(({ labelKey, valueKey }) => (
              <Box key={labelKey} sx={{ mb: 1.5 }}>
                <Typography
                  variant="subtitle1"
                  component="span"
                  sx={{ fontWeight: 600, mr: 1 }}
                >
                  {t(labelKey)}:
                </Typography>
                <Box
                  component="span"
                  sx={{ display: "inline-flex", flexWrap: "wrap", gap: 0.5 }}
                >
                  {t(valueKey)
                    .split(", ")
                    .map((skill) => (
                      <Chip
                        key={skill}
                        label={skill}
                        size="small"
                        sx={{ backgroundColor: chipBg, color: "inherit" }}
                      />
                    ))}
                </Box>
              </Box>
            ))}
          </Box>
        </SectionItem>
      </Box>
    </Box>
  );
}
