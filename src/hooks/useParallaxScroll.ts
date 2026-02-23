"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks window scroll position and returns a parallax offset.
 * The offset = scrollY * factor, updated via requestAnimationFrame for performance.
 */
export function useParallaxScroll(factor: number) {
  const [offset, setOffset] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const isWindowUndefined = typeof window === "undefined";
    if (isWindowUndefined) return;

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setOffset(window.scrollY * factor);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [factor]);

  return offset;
}
