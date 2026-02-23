"use client";

import Box from "@mui/material/Box";
import { styled, useTheme } from "@mui/material/styles";
import { BORDER_BY_MODE } from "@/constants/site";
import {
  CONTENT_COLUMN_WIDTH,
  CONTENT_COLUMN_WIDTH_MOBILE,
  GLASS_ALPHA,
  GLASS_BLUR,
  SECTION_COLORS,
  hexToRgba,
  type SectionId,
} from "@/constants/sections";

interface ParallaxSectionProps {
  sectionId: SectionId;
  /** Skip the 100vh minimum so the section only takes its natural height. */
  compact?: boolean;
  children: React.ReactNode;
}

/**
 * Wrapper for one page section: a frosted-glass 60% content column in the center.
 * Per-item icons are rendered by SectionItem inside children.
 */
export function ParallaxSection({
  sectionId,
  compact,
  children,
}: ParallaxSectionProps) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const solidColor = SECTION_COLORS[mode][sectionId];
  const glassColor = hexToRgba(solidColor, GLASS_ALPHA);

  return (
    <SectionWrapper
      id={`section-${sectionId}`}
      sx={compact ? { minHeight: "auto" } : undefined}
    >
      <ContentColumn
        sx={{
          backgroundColor: glassColor,
          backdropFilter: `blur(${GLASS_BLUR}px)`,
          WebkitBackdropFilter: `blur(${GLASS_BLUR}px)`,
          border: `1px solid ${BORDER_BY_MODE[mode]}`,
          color: "text.primary",
          width: {
            xs: CONTENT_COLUMN_WIDTH_MOBILE,
            md: CONTENT_COLUMN_WIDTH,
          },
        }}
      >
        {children}
      </ContentColumn>
    </SectionWrapper>
  );
}

const SectionWrapper = styled(Box)({
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  minHeight: "100vh",
  zIndex: 1,
});

const ContentColumn = styled(Box)(({ theme }) => ({
  position: "relative",
  padding: theme.spacing(6, 4),
  marginTop: theme.spacing(8),
  marginBottom: theme.spacing(8),
  borderRadius: theme.shape.borderRadius,
  overflow: "visible",
  [theme.breakpoints.down("md")]: {
    padding: theme.spacing(3, 2),
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
  },
}));
