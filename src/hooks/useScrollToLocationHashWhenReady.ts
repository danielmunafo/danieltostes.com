"use client";

import { useEffect } from "react";
import { scrollToLocationHashAfterPaint } from "@/lib/locationHash";

/** Scroll to `location.hash` once content is ready; re-run on `hashchange`. */
export function useScrollToLocationHashWhenReady(
  isContentReady: boolean
): void {
  useEffect(() => {
    if (!isContentReady) return;
    scrollToLocationHashAfterPaint();
    const onHashChange = () => scrollToLocationHashAfterPaint();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [isContentReady]);
}
