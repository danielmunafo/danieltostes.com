"use client";

import { useEffect, useState } from "react";
import { SECTION_IDS, type SectionId } from "@/constants/sections";

/** Fraction of the section height over which we blend from previous to current (0-1). */
const BLEND_ZONE_FRACTION = 0.6;

export interface ActiveSectionState {
  activeSection: SectionId;
  /** Opacity for the previous section's background (1 at section top, 0 after blend zone). */
  previousSectionOpacity: number;
  previousSection: SectionId | null;
}

function getActiveSectionState(): ActiveSectionState {
  const viewportCenterY = window.innerHeight / 2;
  let activeSection: SectionId = SECTION_IDS[0];
  let previousSection: SectionId | null = null;
  let previousSectionOpacity = 0;

  for (let i = 0; i < SECTION_IDS.length; i++) {
    const id = SECTION_IDS[i];
    const el = document.getElementById(`section-${id}`);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.top <= viewportCenterY && rect.bottom >= viewportCenterY) {
      activeSection = id;
      previousSection = i > 0 ? SECTION_IDS[i - 1] : null;
      const safeHeight = Math.max(1, rect.height);
      const progressIntoSection = (viewportCenterY - rect.top) / safeHeight;
      const blendProgress = Math.min(
        1,
        progressIntoSection / BLEND_ZONE_FRACTION
      );
      previousSectionOpacity = 1 - blendProgress;
      break;
    }
  }

  return { activeSection, previousSectionOpacity, previousSection };
}

/**
 * Uses scroll position to detect which section contains the viewport center
 * and how far we've scrolled into it, so the background can blend smoothly
 * from the previous section over a blend zone.
 */
export function useActiveSection(): ActiveSectionState {
  const [state, setState] = useState<ActiveSectionState>(() => ({
    activeSection: SECTION_IDS[0],
    previousSectionOpacity: 0,
    previousSection: null,
  }));

  useEffect(() => {
    const isWindowUndefined = typeof window === "undefined";
    if (isWindowUndefined) return;

    const update = () => {
      setState(getActiveSectionState());
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return state;
}
