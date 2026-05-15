"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type {
  ChartData,
  ChartEvidenceConfidence,
  ChartRecommendation,
} from "../lib/chart-data-types";
import { scoreToChartColor } from "../lib/chart-colors";

const AssistantMatchProfileRadar = dynamic(
  () =>
    import("./AssistantMatchProfileRadar").then(
      (mod) => mod.AssistantMatchProfileRadar
    ),
  { ssr: false }
);

type AssistantMatchProfileProps = {
  readonly chartData: ChartData;
  /** Narrative from pitch `# Scores` when chart UI already shows numeric summary. */
  readonly scoresReason?: string | null;
};

function localizedConfidence(
  value: ChartEvidenceConfidence,
  t: ReturnType<typeof useTranslations<"RecruiterAssistant">>
): string {
  const map: Record<ChartEvidenceConfidence, string> = {
    High: t("chartConfidenceHigh"),
    Medium: t("chartConfidenceMedium"),
    Low: t("chartConfidenceLow"),
  };
  return map[value];
}

function localizedRecommendation(
  value: ChartRecommendation,
  t: ReturnType<typeof useTranslations<"RecruiterAssistant">>
): string {
  const map: Record<ChartRecommendation, string> = {
    "Strong pursue": t("chartRecommendationStrongPursue"),
    Pursue: t("chartRecommendationPursue"),
    "Maybe / validate first": t("chartRecommendationMaybe"),
    "Weak fit": t("chartRecommendationWeakFit"),
    Skip: t("chartRecommendationSkip"),
  };
  return map[value];
}

type SummaryCardProps = {
  readonly label: string;
  readonly value: string;
  readonly scoreForColor?: number;
};

function SummaryCard({ label, value, scoreForColor }: SummaryCardProps) {
  const theme = useTheme();
  const accentColor =
    scoreForColor !== undefined
      ? scoreToChartColor(scoreForColor, theme)
      : theme.palette.text.primary;

  return (
    <Paper
      variant="outlined"
      sx={{
        flex: "1 1 140px",
        minWidth: 120,
        px: 1.5,
        py: 1.25,
        borderColor: "divider",
        bgcolor: alpha(
          accentColor,
          theme.palette.mode === "dark" ? 0.12 : 0.08
        ),
      }}
    >
      <Typography
        variant="caption"
        component="p"
        sx={{
          m: 0,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "text.secondary",
          fontSize: "0.65rem",
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="p"
        sx={{ m: 0, mt: 0.5, fontWeight: 700, color: accentColor }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

export function AssistantMatchProfile({
  chartData,
  scoresReason = null,
}: AssistantMatchProfileProps) {
  const t = useTranslations("RecruiterAssistant");
  const theme = useTheme();
  const { assessmentSummary, capabilityDimensions } = chartData;
  const recommendationColor = scoreToChartColor(
    assessmentSummary.technicalFit,
    theme
  );

  return (
    <Stack spacing={1.5} sx={{ mb: 0.5 }}>
      <Typography
        variant="caption"
        component="p"
        sx={{
          m: 0,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "text.secondary",
          fontSize: "0.65rem",
        }}
      >
        {t("assessmentSummary")}
      </Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
        <SummaryCard
          label={t("technicalFit")}
          value={`${assessmentSummary.technicalFit}/10`}
          scoreForColor={assessmentSummary.technicalFit}
        />
        <SummaryCard
          label={t("evidenceConfidence")}
          value={localizedConfidence(assessmentSummary.evidenceConfidence, t)}
          scoreForColor={
            assessmentSummary.evidenceConfidence === "High"
              ? 9
              : assessmentSummary.evidenceConfidence === "Medium"
                ? 6
                : 3
          }
        />
        <Box
          sx={{
            flex: "1 1 140px",
            minWidth: 120,
            display: "flex",
            alignItems: "stretch",
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              width: "100%",
              px: 1.5,
              py: 1.25,
              borderColor: "divider",
              bgcolor: alpha(
                recommendationColor,
                theme.palette.mode === "dark" ? 0.12 : 0.08
              ),
            }}
          >
            <Typography
              variant="caption"
              component="p"
              sx={{
                m: 0,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "text.secondary",
                fontSize: "0.65rem",
              }}
            >
              {t("recommendation")}
            </Typography>
            <Chip
              label={localizedRecommendation(
                assessmentSummary.recommendation,
                t
              )}
              size="small"
              sx={{
                mt: 0.75,
                fontWeight: 600,
                bgcolor: alpha(recommendationColor, 0.2),
                color: recommendationColor,
                borderColor: alpha(recommendationColor, 0.45),
              }}
              variant="outlined"
            />
          </Paper>
        </Box>
      </Stack>
      {scoresReason ? (
        <Stack spacing={0.5} sx={{ pt: 0.25 }}>
          <Typography
            variant="caption"
            component="p"
            sx={{
              m: 0,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "text.secondary",
              fontSize: "0.65rem",
            }}
          >
            {t("scoresRationaleLabel")}
          </Typography>
          <Typography
            variant="body2"
            component="p"
            sx={{ m: 0, color: "text.secondary" }}
          >
            {scoresReason}
          </Typography>
        </Stack>
      ) : null}
      <Typography
        variant="caption"
        component="p"
        sx={{
          m: 0,
          pt: 0.5,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "text.secondary",
          fontSize: "0.65rem",
        }}
      >
        {t("capabilityMatchProfile")}
      </Typography>
      <AssistantMatchProfileRadar dimensions={capabilityDimensions} />
    </Stack>
  );
}
