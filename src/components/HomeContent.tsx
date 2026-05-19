"use client";

import { ChatHero } from "@/features/recruiter-assistant/components/ChatHero";
import { useScrollToLocationHashWhenReady } from "@/hooks/useScrollToLocationHashWhenReady";
import { ParallaxLayout } from "./sections/ParallaxLayout";

export function HomeContent() {
  useScrollToLocationHashWhenReady(true);

  return (
    <>
      <ChatHero />
      <ParallaxLayout />
    </>
  );
}
