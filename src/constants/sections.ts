/** Section layout, theming, and content-structure constants for the parallax CV page. */

import type { ThemeMode } from "./site";

export const SECTION_IDS = [
  "summary",
  "impact",
  "experience",
  "education",
  "me",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

/** Foreground (content column) background colors per section, keyed by theme mode. */
export const SECTION_COLORS = {
  dark: {
    summary: "#0D1B2A",
    impact: "#1A3D3D",
    experience: "#1B4332",
    education: "#2E1B4E",
    me: "#6B2737",
  },
  light: {
    summary: "#C9D6E3",
    impact: "#C5E3DF",
    experience: "#C9E3D4",
    education: "#E8DCF5",
    me: "#E3C9D1",
  },
} as const satisfies Record<ThemeMode, Record<SectionId, string>>;

/** CSS gradients used as mock background images, keyed by theme mode. */
export const SECTION_BG_GRADIENTS = {
  dark: {
    summary: "linear-gradient(135deg, #1a3a5c 0%, #0a1929 50%, #1a2a3c 100%)",
    impact: "linear-gradient(135deg, #2a5a5a 0%, #0a2e2e 50%, #1a3a3a 100%)",
    experience:
      "linear-gradient(135deg, #2d5a3f 0%, #0a2e1a 50%, #1a3a2a 100%)",
    education: "linear-gradient(135deg, #5b3d8a 0%, #2E1B4E 50%, #3d2862 100%)",
    me: "linear-gradient(135deg, #8b3a4a 0%, #3a0e1a 50%, #5a2030 100%)",
  },
  light: {
    summary: "linear-gradient(135deg, #dae5f0 0%, #c0d0e0 50%, #d0dce8 100%)",
    impact: "linear-gradient(135deg, #d5f0ed 0%, #c0e0dc 50%, #d0e8e5 100%)",
    experience:
      "linear-gradient(135deg, #daf0e5 0%, #c0e0d0 50%, #d0e8dc 100%)",
    education: "linear-gradient(135deg, #e8daf5 0%, #d8c8e8 50%, #e2d4f0 100%)",
    me: "linear-gradient(135deg, #f0dade 0%, #e0c0c8 50%, #e8d0d4 100%)",
  },
} as const satisfies Record<ThemeMode, Record<SectionId, string>>;

/** Backdrop blur (px) for the frosted-glass effect on content columns and TopBar. */
export const GLASS_BLUR = 20;
/** Opacity applied to section background colors for the glass effect. */
export const GLASS_ALPHA = 0.7;

/** Converts a 6-digit hex color to an rgba string with the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Parallax scroll speed multiplier (0 = fixed, 1 = normal scroll). */
export const PARALLAX_FACTOR = 0.3;

export const CONTENT_COLUMN_WIDTH = "60%";
export const CONTENT_COLUMN_WIDTH_MOBILE = "92%";

/** Horizontal padding (px) inside the content column — must match theme.spacing(4). */
export const CONTENT_COLUMN_PADDING_X = 32;

export const SECTION_ICON_SIZE = 160;
export const SECTION_ICON_BORDER_WIDTH = 3;
/** Fraction of icon diameter that overlaps inside the content column (0-1). */
export const SECTION_ICON_OVERLAP_RATIO = 0.5;

/** How far the icon's left/right edge is from the item's content edge (px). */
export const ICON_POSITION_OFFSET =
  CONTENT_COLUMN_PADDING_X +
  Math.round(SECTION_ICON_SIZE * (1 - SECTION_ICON_OVERLAP_RATIO));

/** How many pixels of the icon extend into the item's text area (px). */
const iconContentOverlap =
  Math.round(SECTION_ICON_SIZE * SECTION_ICON_OVERLAP_RATIO) -
  CONTENT_COLUMN_PADDING_X;

/** Extra padding (px) to apply on the icon side of an item so text clears the icon. */
export const ICON_SIDE_PADDING = Math.max(0, iconContentOverlap) + 16;

/** Minimum height (px) for each SectionItem — 2.5× the icon so short items breathe. */
export const SECTION_ITEM_MIN_HEIGHT = Math.round(SECTION_ICON_SIZE * 2.5);

/** Fixed vertical padding (px) inside each SectionItem. */
export const SECTION_ITEM_PADDING_Y = 32;

/** Chip/overlay background for dark and light modes. */
export const CHIP_BG = {
  dark: "rgba(255,255,255,0.15)",
  light: "rgba(0,0,0,0.08)",
} as const;

/**
 * Returns "left" or "right" for an item at the given index within a section.
 * Even-indexed sections start left, odd-indexed sections start right;
 * items within a section alternate from there.
 * Experience starts with the icon on the right; education starts with the icon on the left.
 */
export function getItemSide(
  sectionId: SectionId,
  itemIndex: number
): "left" | "right" {
  const sectionIdx = SECTION_IDS.indexOf(sectionId);
  const baseIsLeft =
    sectionId === "experience"
      ? false
      : sectionId === "education"
        ? true
        : sectionIdx % 2 === 0;
  const flipForItem = itemIndex % 2 !== 0;
  const isLeft = baseIsLeft !== flipForItem;
  return isLeft ? "left" : "right";
}

/** Icon config for each experience role, in the same order as the i18n roles array. */
export const EXPERIENCE_ROLE_ICONS: readonly { src: string; scale?: number }[] =
  [
    { src: "/potenzo.svg" },
    { src: "/ageras.svg" },
    { src: "/klarna.svg", scale: 1.05 },
    { src: "/mercadolivre.svg" },
    { src: "/itau.svg", scale: 1.2 },
    { src: "/pagseguro.svg" },
    { src: "/five.png", scale: 0.8 },
  ];

/** Icon config for each impact item, in the same order as Summary.impact in i18n. */
export const IMPACT_ICONS: readonly { src: string; scale?: number }[] = [
  { src: "/content/impact/0/image.svg", scale: 0.99 },
  { src: "/file.svg" },
  { src: "/window.svg" },
  { src: "/logo.svg", scale: 0.9 },
];

export const SUMMARY_SKILLS = [
  { labelKey: "coreLabel", valueKey: "coreValue" },
  { labelKey: "architectureLabel", valueKey: "architectureValue" },
  { labelKey: "infraLabel", valueKey: "infraValue" },
  { labelKey: "aiLabel", valueKey: "aiValue" },
] as const;
