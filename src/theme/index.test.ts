import { describe, expect, it } from "vitest";
import { THEME_MODE_DARK, THEME_MODE_LIGHT } from "@/constants/site";
import { createAppTheme } from "./index";

describe("createAppTheme", () => {
  it("returns a theme for light mode", () => {
    const theme = createAppTheme(THEME_MODE_LIGHT);
    expect(theme.palette.mode).toBe(THEME_MODE_LIGHT);
    expect(theme.spacing(2)).toBe("16px");
  });

  it("returns a theme for dark mode", () => {
    const theme = createAppTheme(THEME_MODE_DARK);
    expect(theme.palette.mode).toBe(THEME_MODE_DARK);
  });
});
