"use client";

import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import {
  PARALLAX_FACTOR,
  SECTION_BG_GRADIENTS,
  SECTION_IDS,
  type SectionId,
} from "@/constants/sections";
import { useParallaxScroll } from "@/hooks/useParallaxScroll";

interface SectionBackgroundProps {
  activeSection: SectionId;
}

/**
 * Fixed full-viewport layer showing the active section's background.
 * Applies a parallax transform and crossfades between section backgrounds.
 */
export function SectionBackground({ activeSection }: SectionBackgroundProps) {
  const theme = useTheme();
  const gradients = SECTION_BG_GRADIENTS[theme.palette.mode];
  const parallaxOffset = useParallaxScroll(PARALLAX_FACTOR);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100vh",
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {SECTION_IDS.map((id) => {
        const isActive = activeSection === id;
        return (
          <Box
            key={id}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "150%",
              background: gradients[id],
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: isActive ? 1 : 0,
              transition: "opacity 0.8s ease-in-out",
              transform: `translateY(-${parallaxOffset}px)`,
              willChange: "transform, opacity",
            }}
          />
        );
      })}
    </Box>
  );
}
