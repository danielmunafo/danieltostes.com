"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { CHIP_BG, IMPACT_ICONS, getItemSide } from "@/constants/sections";
import { SectionItem } from "./SectionItem";
import { ImpactDetailDialog, contentUrl } from "./ImpactDetailDialog";

const SECTION_ID = "impact" as const;

type ImpactItem = {
  title: string;
  dialogTitle?: string;
  description: string;
  chips?: string[];
};

function cacheKey(bodyPath: string, locale: string): string {
  return `${bodyPath.replace(/\.md$/i, "")}|${locale}`;
}

export function ImpactSection() {
  const locale = useLocale();
  const theme = useTheme();
  const t = useTranslations("Summary");
  const chipBg = CHIP_BG[theme.palette.mode];
  const impactItems = t.raw("impact") as ImpactItem[];
  const impactDetails = t.raw("impactDetails") as {
    bodyPath?: string;
  }[];
  const [selectedImpactIndex, setSelectedImpactIndex] = useState<number | null>(
    null
  );
  const [fetchedBodies, setFetchedBodies] = useState<Record<string, string>>(
    () => ({})
  );

  const prefetchBody = (bodyPath: string | undefined) => {
    if (!bodyPath) return;
    const key = cacheKey(bodyPath, locale);
    if (fetchedBodies[key]) return;
    const url = contentUrl(bodyPath, locale);
    fetch(url)
      .then((res) => {
        if (!res.ok) return;
        return res.text();
      })
      .then((text) => {
        if (text != null)
          setFetchedBodies((prev) => ({ ...prev, [key]: text }));
      })
      .catch(() => {
        // Silently ignore prefetch errors to avoid unhandled promise rejections
      });
  };

  const selectedItem =
    selectedImpactIndex !== null ? impactItems[selectedImpactIndex] : null;
  const selectedTitle = (() => {
    if (selectedItem && typeof selectedItem === "object") {
      if (typeof selectedItem.dialogTitle === "string")
        return selectedItem.dialogTitle;
      if (typeof selectedItem.title === "string") return selectedItem.title;
      return "";
    }
    if (typeof selectedItem === "string") return selectedItem;
    return "";
  })();
  const selectedDetail =
    selectedImpactIndex !== null &&
    impactDetails[selectedImpactIndex] !== undefined
      ? impactDetails[selectedImpactIndex]
      : null;
  const selectedBodyPath = selectedDetail?.bodyPath;

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t("impactTitle")}
      </Typography>

      {impactItems.map((item, i) => {
        const isLast = i === impactItems.length - 1;
        const description =
          typeof item?.description === "string" ? item.description : "";
        const descriptionParagraphs = description
          .split(/\n\n+/)
          .filter(Boolean);
        const itemChips = (item as ImpactItem)?.chips;
        const chips =
          Array.isArray(itemChips) && itemChips.length > 0 ? itemChips : [];
        return (
          <Box key={i}>
            <SectionItem
              sectionId={SECTION_ID}
              side={getItemSide(SECTION_ID, i)}
              iconSrc={IMPACT_ICONS[i]?.src}
              iconAlt={
                typeof item?.title === "string"
                  ? item.title
                  : typeof item === "string"
                    ? item
                    : ""
              }
              iconScale={IMPACT_ICONS[i]?.scale}
              interactive
              expanded={selectedImpactIndex === i}
              onClick={() => setSelectedImpactIndex(i)}
              onMouseEnter={() => prefetchBody(impactDetails[i]?.bodyPath)}
            >
              <Typography variant="h3" component="h3" sx={{ fontWeight: 600 }}>
                {typeof item?.title === "string"
                  ? item.title
                  : typeof item === "string"
                    ? item
                    : ""}
              </Typography>
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
            </SectionItem>
            {!isLast && (
              <Divider sx={{ borderColor: "divider", my: { xs: 1, md: 2 } }} />
            )}
          </Box>
        );
      })}

      <ImpactDetailDialog
        open={selectedImpactIndex !== null}
        onClose={() => setSelectedImpactIndex(null)}
        title={selectedTitle}
        body=""
        bodyPath={selectedBodyPath}
        locale={locale}
        prefetchedBody={
          selectedBodyPath
            ? (fetchedBodies[cacheKey(selectedBodyPath, locale)] ?? null)
            : undefined
        }
        closeLabel={t("impactDetailClose")}
      />
    </Box>
  );
}
