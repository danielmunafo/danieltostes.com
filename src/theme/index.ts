import { createTheme } from "@mui/material/styles";
import {
  BACKGROUND_DARK,
  BACKGROUND_LIGHT,
  PAPER_DARK,
  PAPER_LIGHT,
  THEME_COLOR_PRIMARY,
  THEME_COLOR_PRIMARY_DARK,
  THEME_MODE_LIGHT,
  type ThemeMode,
} from "@/constants/site";

const spacing = 8;

export function createAppTheme(mode: ThemeMode) {
  return createTheme({
    palette: {
      mode,
      ...(mode === THEME_MODE_LIGHT
        ? {
            primary: { main: THEME_COLOR_PRIMARY },
            background: { default: BACKGROUND_LIGHT, paper: PAPER_LIGHT },
          }
        : {
            primary: { main: THEME_COLOR_PRIMARY_DARK },
            background: { default: BACKGROUND_DARK, paper: PAPER_DARK },
          }),
    },
    typography: {
      fontFamily:
        'var(--font-roboto-sans), "Helvetica Neue", Arial, sans-serif',
      h1: { fontSize: "2.5rem", fontWeight: 600 },
      h2: { fontSize: "2rem", fontWeight: 600 },
      h3: { fontSize: "1.5rem", fontWeight: 600 },
      h4: { fontSize: "1.25rem", fontWeight: 500 },
      subtitle1: { fontSize: "1.1rem", lineHeight: 1.5 },
      body1: { fontSize: "1rem", lineHeight: 1.6 },
    },
    spacing,
    shape: { borderRadius: 8 },
    breakpoints: {
      values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
    },
    shadows: [
      "none",
      "0px 2px 4px rgba(0,0,0,0.05)",
      "0px 4px 8px rgba(0,0,0,0.08)",
      "0px 8px 16px rgba(0,0,0,0.08)",
      "0px 12px 24px rgba(0,0,0,0.1)",
      "0px 16px 32px rgba(0,0,0,0.1)",
      "0px 20px 40px rgba(0,0,0,0.12)",
      "0px 24px 48px rgba(0,0,0,0.12)",
      "0px 28px 56px rgba(0,0,0,0.14)",
      "0px 32px 64px rgba(0,0,0,0.14)",
      "0px 36px 72px rgba(0,0,0,0.16)",
      "0px 40px 80px rgba(0,0,0,0.16)",
      "0px 44px 88px rgba(0,0,0,0.18)",
      "0px 48px 96px rgba(0,0,0,0.18)",
      "0px 52px 104px rgba(0,0,0,0.2)",
      "0px 56px 112px rgba(0,0,0,0.2)",
      "0px 60px 120px rgba(0,0,0,0.22)",
      "0px 64px 128px rgba(0,0,0,0.22)",
      "0px 68px 136px rgba(0,0,0,0.24)",
      "0px 72px 144px rgba(0,0,0,0.24)",
      "0px 76px 152px rgba(0,0,0,0.26)",
      "0px 80px 160px rgba(0,0,0,0.26)",
      "0px 84px 168px rgba(0,0,0,0.28)",
      "0px 88px 176px rgba(0,0,0,0.28)",
      "0px 92px 184px rgba(0,0,0,0.3)",
    ],
  });
}
