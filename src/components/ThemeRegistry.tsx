"use client";

import { useMemo } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { useThemeMode } from "@/contexts/ThemeModeContext";
import { createAppTheme } from "@/theme";

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
