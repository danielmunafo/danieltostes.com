"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
import { ImpactDetailDialog, contentUrl } from "./ImpactDetailDialog";
import { SectionItem } from "./SectionItem";

const SECTION_ID = "experience" as const;

const MAX_FETCHED_BODY_CACHE_ENTRIES = 16;

type RoleContext = {
  teamSize?: string;
  companySize?: string;
  sector?: string;
  domain?: string;
  compliance?: string;
  regime?: string;
  workMode?: string;
  location?: string;
};

type ExperienceRole = {
  company: string;
  period: string;
  position: string;
  desc?: string[];
  cardDescription?: string;
  detailBodyPath?: string;
  chips?: string[];
  tech: string;
  context?: RoleContext;
};

const CONTEXT_KEYS: (keyof RoleContext)[] = [
  "teamSize",
  "companySize",
  "sector",
  "domain",
  "compliance",
  "regime",
  "workMode",
  "location",
];

function cacheKey(bodyPath: string, locale: string): string {
  return `${bodyPath.replace(/\.md$/i, "")}|${locale}`;
}

export function ExperienceSection() {
  const locale = useLocale();
  const t = useTranslations("Experience");
  const { palette } = useTheme();
  const chipBg = CHIP_BG[palette.mode];
  const roles = t.raw("roles") as ExperienceRole[];
  const contextLabels = t.raw("contextLabels") as Record<string, string>;
  const [selectedDetailRoleIndex, setSelectedDetailRoleIndex] = useState<
    number | null
  >(null);
  const [fetchedBodies, setFetchedBodies] = useState<Record<string, string>>(
    () => ({})
  );

  const prefetchBody = (bodyPath: string | undefined) => {
    if (!bodyPath) return;
    const key = cacheKey(bodyPath, locale);
    if (fetchedBodies[key]) return;
    const url = contentUrl(bodyPath, locale);
    const isDevelopment = process.env.NODE_ENV === "development";
    fetch(url)
      .then((res) => {
        if (!res.ok) {
          if (isDevelopment) {
            console.warn(
              `[experience] prefetch ${url} failed with status ${res.status}`
            );
          }
          return;
        }
        return res.text();
      })
      .then((text) => {
        if (text == null) return;
        setFetchedBodies((prev) => {
          const next = { ...prev, [key]: text };
          const keys = Object.keys(next);
          if (keys.length <= MAX_FETCHED_BODY_CACHE_ENTRIES) return next;
          const trimmed: Record<string, string> = {};
          for (const cacheKeyName of keys.slice(
            keys.length - MAX_FETCHED_BODY_CACHE_ENTRIES
          )) {
            trimmed[cacheKeyName] = next[cacheKeyName];
          }
          return trimmed;
        });
      })
      .catch(() => {
        // Silently ignore prefetch errors to avoid unhandled promise rejections
      });
  };

  const selectedRole =
    selectedDetailRoleIndex !== null ? roles[selectedDetailRoleIndex] : null;
  const selectedBodyPath =
    selectedRole &&
    typeof selectedRole.detailBodyPath === "string" &&
    selectedRole.detailBodyPath.trim().length > 0
      ? selectedRole.detailBodyPath.trim()
      : undefined;
  const selectedTitle =
    selectedRole && typeof selectedRole.company === "string"
      ? selectedRole.company
      : "";

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t("title")}
      </Typography>

      {roles.map((role, roleIdx) => {
        const isLast = roleIdx === roles.length - 1;
        const detailPath =
          typeof role.detailBodyPath === "string"
            ? role.detailBodyPath.trim()
            : "";
        const hasDetailDialog = detailPath.length > 0;
        const descList = Array.isArray(role.desc) ? role.desc : [];
        const cardDescription =
          typeof role.cardDescription === "string" ? role.cardDescription : "";
        const descriptionParagraphs = cardDescription
          .split(/\n\n+/)
          .filter(Boolean);
        const itemChips = role.chips;
        const chips =
          Array.isArray(itemChips) && itemChips.length > 0 ? itemChips : [];

        return (
          <Box key={roleIdx} id={`section-experience-item-${roleIdx}`}>
            <SectionItem
              sectionId={SECTION_ID}
              side={getItemSide(SECTION_ID, roleIdx)}
              iconSrc={EXPERIENCE_ROLE_ICONS[roleIdx]?.src}
              iconAlt={role.company}
              iconScale={EXPERIENCE_ROLE_ICONS[roleIdx]?.scale}
              interactive={hasDetailDialog}
              expanded={hasDetailDialog && selectedDetailRoleIndex === roleIdx}
              onClick={
                hasDetailDialog
                  ? () => setSelectedDetailRoleIndex(roleIdx)
                  : undefined
              }
              onMouseEnter={
                hasDetailDialog ? () => prefetchBody(detailPath) : undefined
              }
            >
              <Typography variant="h3" component="h3" sx={{ fontWeight: 600 }}>
                {role.company}
              </Typography>

              <Typography
                component="p"
                variant="subtitle1"
                sx={{ opacity: 0.8, mb: 0.5 }}
              >
                {role.position} &middot; {role.period}
              </Typography>

              {hasDetailDialog ? (
                <>
                  {descriptionParagraphs.map((paragraph, pIdx) => (
                    <Typography
                      key={pIdx}
                      variant="body1"
                      component="p"
                      sx={{ mt: pIdx === 0 ? 0.5 : 1, mb: 0 }}
                    >
                      {paragraph}
                    </Typography>
                  ))}
                  {chips.length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                        mt: 3,
                      }}
                    >
                      {chips.map((label, chipIdx) => (
                        <Chip
                          key={chipIdx}
                          label={label}
                          size="small"
                          sx={{
                            backgroundColor: chipBg,
                            color: "inherit",
                            fontSize: "0.7rem",
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </>
              ) : (
                <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                  {descList.map((text, i) => (
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
              )}

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.5,
                  ...(hasDetailDialog ? { mt: 3 } : {}),
                }}
              >
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

              {role.context && (
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.5,
                    mt: 1,
                  }}
                >
                  {CONTEXT_KEYS.map((key) => {
                    const value = role.context?.[key];
                    const label = contextLabels[key];
                    if (!value || !label) return null;
                    return (
                      <Chip
                        key={key}
                        label={`${label}: ${value}`}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: "0.65rem",
                          opacity: 0.6,
                          borderColor: "currentColor",
                        }}
                      />
                    );
                  })}
                </Box>
              )}
            </SectionItem>

            {!isLast && (
              <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />
            )}
          </Box>
        );
      })}

      <ImpactDetailDialog
        open={selectedDetailRoleIndex !== null}
        onClose={() => setSelectedDetailRoleIndex(null)}
        title={selectedTitle}
        body=""
        bodyPath={selectedBodyPath}
        locale={locale}
        prefetchedBody={
          selectedBodyPath
            ? (fetchedBodies[cacheKey(selectedBodyPath, locale)] ?? null)
            : undefined
        }
        closeLabel={t("detailClose")}
        glassSectionId="experience"
      />
    </Box>
  );
}
