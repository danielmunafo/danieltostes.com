"use client";

import { ChatHero } from "@/features/recruiter-assistant/components/ChatHero";
import { ParallaxLayout } from "./sections/ParallaxLayout";

export function HomeContent() {
  return (
    <>
      <ChatHero />
      <ParallaxLayout />
    </>
  );
}
