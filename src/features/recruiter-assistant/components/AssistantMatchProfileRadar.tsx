"use client";

import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { RECRUITER_MATCH_PROFILE_CHART_HEIGHT_PX } from "../constants/recruiter-assistant";
import type { CapabilityDimension } from "../lib/chart-data-types";
import { scoreToChartColor } from "../lib/chart-colors";

type RadarRow = {
  readonly label: string;
  readonly score: number;
  readonly evidenceLevel: CapabilityDimension["evidenceLevel"];
  readonly rationale: string;
};

type AssistantMatchProfileRadarProps = {
  readonly dimensions: readonly CapabilityDimension[];
};

function ChartTooltip({
  active,
  payload,
}: {
  readonly active?: boolean;
  readonly payload?: readonly { readonly payload?: RadarRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        px: 1.25,
        py: 0.75,
        maxWidth: 280,
        boxShadow: 1,
      }}
    >
      <Box component="p" sx={{ m: 0, fontWeight: 600, fontSize: "0.8125rem" }}>
        {row.label} — {row.score}/10
      </Box>
      <Box
        component="p"
        sx={{
          m: 0,
          mt: 0.5,
          fontSize: "0.75rem",
          color: "text.secondary",
          textTransform: "capitalize",
        }}
      >
        {row.evidenceLevel.replace(/_/g, " ")}
      </Box>
      <Box
        component="p"
        sx={{ m: 0, mt: 0.5, fontSize: "0.75rem", lineHeight: 1.45 }}
      >
        {row.rationale}
      </Box>
    </Box>
  );
}

export function AssistantMatchProfileRadar({
  dimensions,
}: AssistantMatchProfileRadarProps) {
  const theme = useTheme();
  const data: RadarRow[] = dimensions.map((d) => ({
    label: d.label,
    score: d.score,
    evidenceLevel: d.evidenceLevel,
    rationale: d.rationale,
  }));

  const averageScore =
    data.length > 0
      ? data.reduce((sum, row) => sum + row.score, 0) / data.length
      : 0;
  const fillColor = scoreToChartColor(Math.round(averageScore), theme);

  return (
    <Box
      sx={{ width: "100%", height: RECRUITER_MATCH_PROFILE_CHART_HEIGHT_PX }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke={theme.palette.divider} />
          <PolarAngleAxis
            dataKey="label"
            tick={{
              fill: theme.palette.text.secondary,
              fontSize: 10,
            }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Radar
            name="Score"
            dataKey="score"
            stroke={fillColor}
            fill={fillColor}
            fillOpacity={0.28}
            dot={(props) => {
              const { cx, cy, index } = props;
              const row = data[index ?? 0];
              if (cx === undefined || cy === undefined || !row) {
                return <g />;
              }
              return (
                <circle
                  key={`${row.label}-${index}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={scoreToChartColor(row.score, theme)}
                  stroke={theme.palette.background.paper}
                  strokeWidth={1}
                />
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Box>
  );
}
