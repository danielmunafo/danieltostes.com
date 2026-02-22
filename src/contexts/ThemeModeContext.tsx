"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  THEME_MODE_DARK,
  THEME_MODE_LIGHT,
  type ThemeMode,
} from "@/constants/site";

const THEME_MODES: readonly [ThemeMode, ThemeMode] = [
  THEME_MODE_LIGHT,
  THEME_MODE_DARK,
];
const DEFAULT_THEME_MODE: ThemeMode = THEME_MODE_LIGHT;
const STORAGE_KEY = "theme-mode";
const OS_PREFERS_DARK_THEME = "(prefers-color-scheme: dark)";
const MUI_COLOR_SCHEME_DOCUMENT_KEY = "data-mui-color-scheme";

type ThemeModeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && THEME_MODES.includes(value as ThemeMode);
}

function getInitialMode(): ThemeMode {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return DEFAULT_THEME_MODE;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isThemeMode(stored)) return stored;
  const osPrefersDark = window.matchMedia(OS_PREFERS_DARK_THEME).matches;
  return osPrefersDark ? THEME_MODES[1] : THEME_MODES[0];
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(DEFAULT_THEME_MODE);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMode(getInitialMode());
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.setAttribute(MUI_COLOR_SCHEME_DOCUMENT_KEY, mode);
  }, [mode, mounted]);

  const toggleMode = useCallback(() => {
    setMode((prev) =>
      prev === THEME_MODES[0] ? THEME_MODES[1] : THEME_MODES[0]
    );
  }, []);

  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx)
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  return ctx;
}
