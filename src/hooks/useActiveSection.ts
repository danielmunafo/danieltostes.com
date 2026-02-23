"use client";

import { useEffect, useState } from "react";
import { SECTION_IDS, type SectionId } from "@/constants/sections";

/**
 * Uses IntersectionObserver to detect which section occupies the center
 * of the viewport, returning the active SectionId.
 *
 * A narrow detection band (middle 10% of the viewport) avoids flicker
 * when two sections are partially visible.
 */
export function useActiveSection(): SectionId {
  const [activeSection, setActiveSection] = useState<SectionId>(SECTION_IDS[0]);

  useEffect(() => {
    const isWindowUndefined = typeof window === "undefined";
    if (isWindowUndefined) return;

    const sectionElements = SECTION_IDS.map((id) =>
      document.getElementById(`section-${id}`)
    ).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("section-", "") as SectionId;
            setActiveSection(id);
            break;
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sectionElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return activeSection;
}
