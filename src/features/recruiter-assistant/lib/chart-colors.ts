import type { Theme } from "@mui/material/styles";

/** Score band colors for match profile cards and radar vertices. */
export function scoreToChartColor(score: number, theme: Theme): string {
  if (score <= 2) return theme.palette.grey[500];
  if (score <= 4) return theme.palette.error.main;
  if (score <= 7) return theme.palette.warning.main;
  return theme.palette.success.main;
}
