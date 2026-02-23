"use client";

import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import {
  CHIP_BG,
  EXPERIENCE_ROLE_ICONS,
  getItemSide,
} from "@/constants/sections";
import { SectionItem } from "./SectionItem";

const SECTION_ID = "experience" as const;

type ExperienceRole = {
  company: string;
  period: string;
  position: string;
  desc: string[];
  tech: string;
};

export function ExperienceSection() {
  const t = useTranslations("Experience");
  const { palette } = useTheme();
  const chipBg = CHIP_BG[palette.mode];
  const roles = t.raw("roles") as ExperienceRole[];

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t("title")}
      </Typography>

      {roles.map((role, roleIdx) => {
        const isLast = roleIdx === roles.length - 1;
        return (
          <Box key={roleIdx}>
            <SectionItem
              sectionId={SECTION_ID}
              side={getItemSide(SECTION_ID, roleIdx)}
              iconSrc={EXPERIENCE_ROLE_ICONS[roleIdx]?.src}
              iconScale={EXPERIENCE_ROLE_ICONS[roleIdx]?.scale}
            >
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {role.company}
              </Typography>

              <Typography variant="subtitle1" sx={{ opacity: 0.8, mb: 0.5 }}>
                {role.position} &middot; {role.period}
              </Typography>

              <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                {role.desc.map((text, i) => (
                  <Typography
                    key={i}
                    component="li"
                    variant="body1"
                    sx={{ mb: 0.5 }}
                  >
                    {text}
                  </Typography>
                ))}
              </Box>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {role.tech.split(", ").map((tech) => (
                  <Chip
                    key={tech}
                    label={tech}
                    size="small"
                    sx={{
                      backgroundColor: chipBg,
                      color: "inherit",
                      fontSize: "0.7rem",
                    }}
                  />
                ))}
              </Box>
            </SectionItem>

            {!isLast && (
              <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
