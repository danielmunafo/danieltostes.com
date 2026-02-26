import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SECTION_IDS } from "@/constants/sections";
import { useActiveSection } from "./useActiveSection";

describe("useActiveSection", () => {
  beforeEach(() => {
    vi.stubGlobal("innerHeight", 800);
    for (const id of SECTION_IDS) {
      const el = document.createElement("div");
      el.id = `section-${id}`;
      document.body.appendChild(el);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("defaults to the first section", () => {
    const { result } = renderHook(() => useActiveSection());
    expect(result.current.activeSection).toBe(SECTION_IDS[0]);
    expect(result.current.previousSection).toBeNull();
  });

  it("returns the section that contains the viewport center", () => {
    const rectAbove = {
      top: -500,
      bottom: -300,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: -500,
      toJSON: () => ({}),
    };
    const rectContainsCenter = {
      top: 300,
      bottom: 500,
      left: 0,
      right: 100,
      width: 100,
      height: 200,
      x: 0,
      y: 300,
      toJSON: () => ({}),
    };
    ["summary", "impact"].forEach((id) => {
      vi.spyOn(
        document.getElementById(`section-${id}`)!,
        "getBoundingClientRect"
      ).mockReturnValue(rectAbove);
    });
    vi.spyOn(
      document.getElementById("section-experience")!,
      "getBoundingClientRect"
    ).mockReturnValue(rectContainsCenter);

    const { result } = renderHook(() => useActiveSection());

    expect(result.current.activeSection).toBe("experience");
    expect(result.current.previousSection).toBe("impact");
  });

  it("returns first section when no section contains center", () => {
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(`section-${id}`)!;
      vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
        top: -1000,
        bottom: -800,
        left: 0,
        right: 100,
        width: 100,
        height: 200,
        x: 0,
        y: -1000,
        toJSON: () => ({}),
      });
    });

    const { result } = renderHook(() => useActiveSection());

    expect(result.current.activeSection).toBe(SECTION_IDS[0]);
  });

  it("removes scroll and resize listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useActiveSection());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
