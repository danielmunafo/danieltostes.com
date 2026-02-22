"use client";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import IconButton from "@mui/material/IconButton";
import { useTranslations } from "next-intl";
import { THEME_MODE_LIGHT } from "@/constants/site";
import { useThemeMode } from "@/contexts/ThemeModeContext";

export function ThemeToggle() {
  const { mode, toggleMode } = useThemeMode();
  const t = useTranslations("ThemeToggle");

  return (
    <IconButton
      onClick={toggleMode}
      color="inherit"
      aria-label={mode === THEME_MODE_LIGHT ? t("light") : t("dark")}
      sx={{ ml: 1 }}
    >
      {mode === THEME_MODE_LIGHT ? (
        <DarkModeIcon aria-hidden />
      ) : (
        <LightModeIcon aria-hidden />
      )}
    </IconButton>
  );
}
