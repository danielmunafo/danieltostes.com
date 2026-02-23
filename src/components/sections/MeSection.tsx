"use client";

import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
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
      >
        <Typography variant="body1" sx={{ opacity: 0.7 }}>
          {t("placeholder")}
        </Typography>
      </SectionItem>
    </Box>
  );
}
