import { createTheme } from "@mui/material/styles";
import { describe, expect, it } from "vitest";
import { scoreToChartColor } from "./chart-colors";

describe("scoreToChartColor", () => {
  const theme = createTheme();

  it("returns grey for scores 0-2", () => {
    expect(scoreToChartColor(0, theme)).toBe(theme.palette.grey[500]);
    expect(scoreToChartColor(2, theme)).toBe(theme.palette.grey[500]);
  });

  it("returns red for scores 3-4", () => {
    expect(scoreToChartColor(3, theme)).toBe(theme.palette.error.main);
    expect(scoreToChartColor(4, theme)).toBe(theme.palette.error.main);
  });

  it("returns warning for scores 5-7", () => {
    expect(scoreToChartColor(5, theme)).toBe(theme.palette.warning.main);
    expect(scoreToChartColor(7, theme)).toBe(theme.palette.warning.main);
  });

  it("returns success for scores 8-10", () => {
    expect(scoreToChartColor(8, theme)).toBe(theme.palette.success.main);
    expect(scoreToChartColor(10, theme)).toBe(theme.palette.success.main);
  });
});
