/** Shared site-wide constants for metadata and theme. */

export const THEME_MODE_LIGHT = "light";
export const THEME_MODE_DARK = "dark";
export type ThemeMode = typeof THEME_MODE_LIGHT | typeof THEME_MODE_DARK;

/** Default time zone for i18n date/time formatting (server and client). */
export const DEFAULT_TIME_ZONE = "UTC";

export const SITE_URL = "https://danieltostes.com";
export const SITE_NAME = "danieltostes.com";
export const SITE_SHORT_NAME = "danieltostes";
/** Display name for the app bar and branding. */
export const SITE_AUTHOR_DISPLAY_NAME = "Daniel Tostes";
export const SITE_DESCRIPTION = "Personal blog and CV";

/** Default page title for metadata and Open Graph. */
export const META_TITLE = "Daniel Munafó Tostes - Senior Software Engineer";
/** Default meta description (search and general). */
export const META_DESCRIPTION =
  "Senior Software Engineer building scalable product platforms, distributed systems, and cloud-native architectures.";
/** Tagline used for Open Graph and Twitter cards. */
export const META_OG_TAGLINE =
  "Scalable systems • Static-first architecture • Cloud-native engineering";

export const LINKEDIN_PROFILE_URL = "https://www.linkedin.com/in/dantostes/";
export const GITHUB_PROFILE_URL = "https://github.com/danielmunafo";
export const CONTACT_EMAIL = "dann.tostes@gmail.com";

/** MUI light theme primary. */
export const THEME_COLOR_PRIMARY = "#1976d2";
/** MUI light theme default background. */
export const BACKGROUND_LIGHT = "#ffffff";
/** MUI light theme paper/surface background. */
export const PAPER_LIGHT = "#f5f5f5";
/** MUI dark theme primary. */
export const THEME_COLOR_PRIMARY_DARK = "#90caf9";
/** MUI dark theme default background. */
export const BACKGROUND_DARK = "#121212";
/** MUI dark theme paper/surface background. */
export const PAPER_DARK = "#1e1e1e";

/** Border color for glass/surface elements, keyed by theme mode. */
export const BORDER_BY_MODE = {
  light: "rgba(0,0,0,0.08)",
  dark: "rgba(255,255,255,0.1)",
} as const satisfies Record<ThemeMode, string>;

/** Background color for frosted-glass overlays (e.g. TopBar, dropdowns), keyed by theme mode. */
export const TOP_BAR_GLASS_BG_BY_MODE = {
  light: "rgba(255,255,255,0.75)",
  dark: "rgba(0,0,0,0.75)",
} as const satisfies Record<ThemeMode, string>;

export const GLASS_BG_BY_MODE = {
  light: "rgba(255,255,255,0.98)",
  dark: "rgba(0,0,0,0.98)",
} as const satisfies Record<ThemeMode, string>;

/** Text/icon color on glass overlays (e.g. TopBar), keyed by theme mode. */
export const TEXT_ON_GLASS_BY_MODE = {
  light: "#000000",
  dark: "#ffffff",
} as const satisfies Record<ThemeMode, string>;

/** Box shadow for glass overlays (e.g. TopBar), keyed by theme mode. */
export const GLASS_SHADOW_BY_MODE = {
  light: "0 1px 4px rgba(0,0,0,0.12)",
  dark: "0 1px 4px rgba(0,0,0,0.4)",
} as const satisfies Record<ThemeMode, string>;
