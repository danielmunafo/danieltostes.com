"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, keyframes, useTheme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import {
  RECRUITER_ASSISTANT_SECTION_BLOCK_GAP,
  RECRUITER_MATCH_PROFILE_CHART_HEIGHT_PX,
} from "../constants/recruiter-assistant";
import { recruiterAssistantBriefingSectionHeadingSx } from "../lib/recruiter-assistant-briefing-heading-sx";

const RADAR_SKELETON_VERTEX_COUNT = 8;
const RADAR_SKELETON_RADIUS_PCT = 42;

const radarPulse = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.85; }
`;

function polarToPercent(
  index: number,
  count: number,
  radiusPct: number
): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: 50 + radiusPct * Math.cos(angle),
    y: 50 + radiusPct * Math.sin(angle),
  };
}

function SummaryCardSkeleton() {
  return (
    <Paper
      variant="outlined"
      sx={{
        flex: "1 1 140px",
        minWidth: 120,
        px: 1.5,
        py: 1.25,
        borderColor: "divider",
      }}
    >
      <Skeleton variant="text" width="72%" height={14} animation="wave" />
      <Skeleton
        variant="text"
        width="48%"
        height={22}
        animation="wave"
        sx={{ mt: 0.75 }}
      />
    </Paper>
  );
}

function RadarChartSkeleton() {
  const theme = useTheme();
  const center = { x: 50, y: 50 };
  const vertices = Array.from({ length: RADAR_SKELETON_VERTEX_COUNT }, (_, i) =>
    polarToPercent(i, RADAR_SKELETON_VERTEX_COUNT, RADAR_SKELETON_RADIUS_PCT)
  );
  const polygonPoints = vertices.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: RECRUITER_MATCH_PROFILE_CHART_HEIGHT_PX,
        minHeight: RECRUITER_MATCH_PROFILE_CHART_HEIGHT_PX,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: alpha(
          theme.palette.primary.main,
          theme.palette.mode === "dark" ? 0.08 : 0.05
        ),
        overflow: "hidden",
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        sx={{
          position: "absolute",
          inset: "8% 6%",
          width: "88%",
          height: "84%",
          animation: `${radarPulse} 1.8s ease-in-out infinite`,
        }}
        aria-hidden
      >
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={vertices
              .map((_, i) => {
                const p = polarToPercent(
                  i,
                  RADAR_SKELETON_VERTEX_COUNT,
                  RADAR_SKELETON_RADIUS_PCT * scale
                );
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.35}
            opacity={0.2}
          />
        ))}
        {vertices.map((vertex, i) => (
          <line
            key={`axis-${i}`}
            x1={center.x}
            y1={center.y}
            x2={vertex.x}
            y2={vertex.y}
            stroke="currentColor"
            strokeWidth={0.35}
            opacity={0.25}
          />
        ))}
        <polygon
          points={polygonPoints}
          fill={alpha(theme.palette.primary.main, 0.12)}
          stroke={theme.palette.primary.main}
          strokeWidth={0.8}
          opacity={0.55}
        />
        {vertices.map((vertex, i) => (
          <circle
            key={`node-${i}`}
            cx={vertex.x}
            cy={vertex.y}
            r={1.4}
            fill={theme.palette.primary.main}
            opacity={0.65}
          />
        ))}
      </Box>
      {vertices.map((vertex, i) => (
        <Skeleton
          key={`label-${i}`}
          variant="rounded"
          animation="wave"
          sx={{
            position: "absolute",
            left: `${vertex.x}%`,
            top: `${vertex.y}%`,
            width: { xs: 48, sm: 56 },
            height: 10,
            transform: "translate(-50%, -50%)",
            opacity: 0.55,
          }}
        />
      ))}
    </Box>
  );
}

export function AssistantMatchProfileSkeleton() {
  const t = useTranslations("RecruiterAssistant");

  return (
    <Stack
      spacing={0}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t("briefingMatchProfileLabel")}
    >
      <Typography
        variant="body1"
        component="h1"
        sx={{
          ...recruiterAssistantBriefingSectionHeadingSx,
          mt: 0,
        }}
      >
        {t("assessmentSummary")}
      </Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
      </Stack>
      <Typography
        variant="body1"
        component="h1"
        sx={{
          ...recruiterAssistantBriefingSectionHeadingSx,
          mt: RECRUITER_ASSISTANT_SECTION_BLOCK_GAP,
        }}
      >
        {t("capabilityMatchProfile")}
      </Typography>
      <RadarChartSkeleton />
    </Stack>
  );
}
