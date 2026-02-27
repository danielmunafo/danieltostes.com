import { describe, expect, it } from "vitest";
import {
  CHIP_BG,
  CONTENT_COLUMN_PADDING_X,
  GLASS_ALPHA,
  GLASS_BLUR,
  ICON_POSITION_OFFSET,
  ICON_SIDE_PADDING,
  SECTION_BG_GRADIENTS,
  SECTION_COLORS,
  SECTION_ICON_OVERLAP_RATIO,
  SECTION_ICON_SIZE,
  SECTION_IDS,
  SECTION_ITEM_MIN_HEIGHT,
  SECTION_ITEM_PADDING_Y,
  getItemSide,
  hexToRgba,
  type SectionId,
} from "./sections";

describe("hexToRgba", () => {
  it("converts black with full opacity", () => {
    expect(hexToRgba("#000000", 1)).toBe("rgba(0, 0, 0, 1)");
  });

  it("converts white with half opacity", () => {
    expect(hexToRgba("#FFFFFF", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
  });

  it("converts an arbitrary color", () => {
    expect(hexToRgba("#0D1B2A", 0.7)).toBe("rgba(13, 27, 42, 0.7)");
  });

  it("handles zero alpha", () => {
    expect(hexToRgba("#FF0000", 0)).toBe("rgba(255, 0, 0, 0)");
  });
});

describe("getItemSide", () => {
  it("returns left for even-indexed section, first item", () => {
    expect(getItemSide("summary", 0)).toBe("left");
  });

  it("alternates sides within a section", () => {
    expect(getItemSide("summary", 0)).toBe("left");
    expect(getItemSide("summary", 1)).toBe("right");
    expect(getItemSide("summary", 2)).toBe("left");
  });

  it("odd-indexed sections start right", () => {
    expect(getItemSide("impact", 0)).toBe("right");
    expect(getItemSide("impact", 1)).toBe("left");
  });

  it("covers all sections at item 0", () => {
    const expected: Record<SectionId, "left" | "right"> = {
      summary: "left",
      impact: "right",
      experience: "left",
      education: "left",
      me: "left",
    };
    for (const id of SECTION_IDS) {
      expect(getItemSide(id, 0)).toBe(expected[id]);
    }
  });
});

describe("SECTION_COLORS", () => {
  it("provides colors for every section in both themes", () => {
    for (const id of SECTION_IDS) {
      expect(SECTION_COLORS.dark[id]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(SECTION_COLORS.light[id]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("dark and light colors differ per section", () => {
    for (const id of SECTION_IDS) {
      expect(SECTION_COLORS.dark[id]).not.toBe(SECTION_COLORS.light[id]);
    }
  });
});

describe("SECTION_BG_GRADIENTS", () => {
  it("provides gradients for every section in both themes", () => {
    for (const id of SECTION_IDS) {
      expect(SECTION_BG_GRADIENTS.dark[id]).toContain("linear-gradient");
      expect(SECTION_BG_GRADIENTS.light[id]).toContain("linear-gradient");
    }
  });
});

describe("layout constants consistency", () => {
  it("SECTION_ITEM_MIN_HEIGHT equals 2.5× icon size", () => {
    expect(SECTION_ITEM_MIN_HEIGHT).toBe(Math.round(SECTION_ICON_SIZE * 2.5));
  });

  it("ICON_POSITION_OFFSET accounts for padding and non-overlapping portion", () => {
    const expected =
      CONTENT_COLUMN_PADDING_X +
      Math.round(SECTION_ICON_SIZE * (1 - SECTION_ICON_OVERLAP_RATIO));
    expect(ICON_POSITION_OFFSET).toBe(expected);
  });

  it("ICON_SIDE_PADDING is positive", () => {
    expect(ICON_SIDE_PADDING).toBeGreaterThan(0);
  });

  it("glass constants are within sensible ranges", () => {
    expect(GLASS_BLUR).toBeGreaterThan(0);
    expect(GLASS_ALPHA).toBeGreaterThan(0);
    expect(GLASS_ALPHA).toBeLessThan(1);
  });

  it("SECTION_ITEM_PADDING_Y matches CONTENT_COLUMN_PADDING_X", () => {
    expect(SECTION_ITEM_PADDING_Y).toBe(CONTENT_COLUMN_PADDING_X);
  });

  it("CHIP_BG has entries for both modes", () => {
    expect(CHIP_BG.dark).toContain("rgba");
    expect(CHIP_BG.light).toContain("rgba");
  });
});
