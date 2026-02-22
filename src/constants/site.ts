/** Shared site-wide constants for metadata, PWA manifest, and theme. */

export const THEME_MODE_LIGHT = "light";
export const THEME_MODE_DARK = "dark";
export type ThemeMode = typeof THEME_MODE_LIGHT | typeof THEME_MODE_DARK;

/** Default time zone for i18n date/time formatting (server and client). */
export const DEFAULT_TIME_ZONE = "UTC";

export const SITE_URL = "https://danieltostes.com";
export const SITE_NAME = "danieltostes.com";
export const SITE_SHORT_NAME = "danieltostes";
export const SITE_DESCRIPTION = "Personal blog and CV";

export const LINKEDIN_PROFILE_URL = "https://www.linkedin.com/in/dantostes/";

/** Used for PWA theme_color and MUI light primary. */
export const THEME_COLOR_PRIMARY = "#1976d2";
/** Used for PWA background_color and MUI light background default. */
export const BACKGROUND_LIGHT = "#ffffff";
/** MUI light theme paper/surface background. */
export const PAPER_LIGHT = "#f5f5f5";
/** MUI dark theme primary. */
export const THEME_COLOR_PRIMARY_DARK = "#90caf9";
/** MUI dark theme default background. */
export const BACKGROUND_DARK = "#121212";
/** MUI dark theme paper/surface background. */
export const PAPER_DARK = "#1e1e1e";

export const PWA_START_URL = "/";
export const PWA_FAVICON_SRC = "/favicon.ico";
