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

const BLOCK_ICONS: Partial<Record<string, { src: string; alt: string }>> = {
  eduBlock: { src: "/cps.png", alt: "CPS" },
  coursesBlock: { src: "/aws.svg", alt: "AWS" },
};

export function EducationSection() {
  const t = useTranslations("Education");
  const { palette } = useTheme();
  const chipBg = CHIP_BG[palette.mode];
  const blockOrder = (t.raw("blockOrder") as string[]) || [];

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t("title")}
      </Typography>

      {blockOrder.map((blockKey, itemIndex) => {
        const block = t.raw(blockKey) as Record<string, unknown>;
        if (!block || typeof block !== "object") return null;

        const icon = BLOCK_ICONS[blockKey];
        const isLast = itemIndex === blockOrder.length - 1;

        return (
          <Box key={blockKey}>
            <Box id={`section-${SECTION_ID}-item-${itemIndex}`}>
              <SectionItem
                sectionId={SECTION_ID}
                side={getItemSide(SECTION_ID, itemIndex)}
                iconSrc={icon?.src}
                iconAlt={icon?.alt}
                compact
              >
                {blockKey === "eduBlock" && (
                  <>
                    {(block.edu as EduItem[])?.map((item, i) => (
                      <Box
                        key={i}
                        sx={{
                          mb: i < (block.edu as EduItem[]).length - 1 ? 2 : 0,
                        }}
                      >
                        <Typography
                          variant="h3"
                          component="h3"
                          sx={{ fontWeight: 600 }}
                        >
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
                  </>
                )}
                {blockKey === "coursesBlock" && (
                  <>
                    <Typography variant="h3" gutterBottom>
                      {block.title as string}
                    </Typography>
                    {(block.courses as CourseItem[])?.map((item, i) => (
                      <Typography key={i} variant="body1" sx={{ mb: 1 }}>
                        {item.name} &mdash; {item.provider}
                      </Typography>
                    ))}
                  </>
                )}
                {blockKey === "languagesBlock" && (
                  <>
                    <Typography variant="h3" gutterBottom>
                      {block.title as string}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {(block.languages as LanguageItem[])?.map((lang, i) => (
                        <Chip
                          key={i}
                          label={`${lang.name} — ${lang.level}`}
                          sx={{ backgroundColor: chipBg, color: "inherit" }}
                        />
                      ))}
                    </Box>
                  </>
                )}
                {blockKey === "permitsBlock" && (
                  <>
                    <Typography variant="h3" gutterBottom>
                      {block.title as string}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {(block.permits as string[])?.map((label, i) => (
                        <Chip
                          key={i}
                          label={label}
                          sx={{ backgroundColor: chipBg, color: "inherit" }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </SectionItem>
            </Box>
            {!isLast && (
              <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
