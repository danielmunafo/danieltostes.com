"use client";

import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
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
  previousSection: SectionId | null;
  previousSectionOpacity: number;
}

/**
 * Fixed full-viewport layer showing the active section's background, blending
 * from the previous section over a scroll-linked zone, with parallax on desktop.
 */
export function SectionBackground({
  activeSection,
  previousSection,
  previousSectionOpacity,
}: SectionBackgroundProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const gradients = SECTION_BG_GRADIENTS[theme.palette.mode];
  const parallaxOffset = useParallaxScroll(isMobile ? 0 : PARALLAX_FACTOR);

  const activeGradient = gradients[activeSection];

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        minHeight: "100vh",
        width: "100%",
        height: "100%",
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: activeGradient,
      }}
    >
      {SECTION_IDS.map((id) => {
        const isActive = activeSection === id;
        const isPrevious = previousSection === id;
        const opacity = isActive ? 1 : isPrevious ? previousSectionOpacity : 0;
        return (
          <Box
            key={id}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: isMobile ? "100%" : "500%",
              background: gradients[id],
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity,
              transition: "opacity 0.5s ease-out",
              transform: isMobile ? "none" : `translateY(-${parallaxOffset}px)`,
              willChange: isMobile ? "opacity" : "transform, opacity",
            }}
          />
        );
      })}
    </Box>
  );
}
