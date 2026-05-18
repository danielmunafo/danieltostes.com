"use client";

import { useEffect, useState } from "react";
import { PARALLAX_FACTOR } from "@/constants/sections";
import { CHAT_HERO_FADE_DISTANCE_PX } from "../constants/recruiter-assistant";

export interface ChatFadeState {
  opacity: number;
  translateY: number;
}

/**
 * Scroll-linked fade and slight vertical offset for the assistant hero
 * (hands off visually to the parallax sections below).
 */
export function useChatFade(): ChatFadeState {
  const [state, setState] = useState<ChatFadeState>({
    opacity: 1,
    translateY: 0,
  });

  useEffect(() => {
    const isWindowUndefined = typeof window === "undefined";
    if (isWindowUndefined) return;

    const onScroll = () => {
      const scrollY = window.scrollY;
      const progress = Math.min(1, scrollY / CHAT_HERO_FADE_DISTANCE_PX);
      const opacity = 1 - progress * 0.65;
      const translateY = -scrollY * PARALLAX_FACTOR * 0.35;
      setState({ opacity, translateY });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return state;
}
