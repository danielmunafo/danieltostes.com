"use client";

import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import Box from "@mui/material/Box";
import { alpha, useTheme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PARALLAX_SECTION_IDS } from "@/constants/sections";
import {
  ASSISTANT_SCROLL_CUE_BORDER_ALPHA_DARK,
  ASSISTANT_SCROLL_CUE_BORDER_ALPHA_LIGHT,
  ASSISTANT_SCROLL_CUE_CHEVRON_OPACITY,
  ASSISTANT_SCROLL_CUE_CHEVRON_OFFSET_Y_PX,
  ASSISTANT_SCROLL_CUE_FADE_DISTANCE_PX,
  ASSISTANT_SCROLL_CUE_FILL_ALPHA,
  ASSISTANT_SCROLL_CUE_MAX_OPACITY,
  ASSISTANT_SCROLL_CUE_SHADOW_ALPHA_DARK,
  ASSISTANT_SCROLL_CUE_SHADOW_ALPHA_LIGHT,
} from "../constants/recruiter-assistant";
import { useRecruiterAssistantUi } from "../context/RecruiterAssistantUiContext";

/**
 * Full circular cue fixed to the viewport: the horizontal diameter through the
 * circle's center sits on the safe-area bottom line (half above, half below that
 * anchor). The chevron sits in the upper half of the visible disk. Fades out with
 * page scroll. Click scrolls to the first parallax section (`section-${PARALLAX_SECTION_IDS[0]}`).
 */
const CUE_RADIUS_PX = 20;
const CUE_WIDTH_PX = CUE_RADIUS_PX * 2;

export function AssistantScrollDownCue() {
  const theme = useTheme();
  const t = useTranslations("RecruiterAssistant");
  const { assistantLocked } = useRecruiterAssistantUi();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (assistantLocked) return;
    const isWindowUndefined = typeof window === "undefined";
    if (isWindowUndefined) return;

    const onScroll = () => {
      setScrollY(window.scrollY);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [assistantLocked]);

  if (assistantLocked) {
    return null;
  }

  const scrollToFirstSection = () => {
    const isWindowUndefined = typeof window === "undefined";
    if (isWindowUndefined) return;

    const firstSectionId = PARALLAX_SECTION_IDS[0];
    const firstSectionElement = document.getElementById(
      `section-${firstSectionId}`
    );
    if (!firstSectionElement) return;

    firstSectionElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const scrollProgress = Math.min(
    1,
    scrollY / ASSISTANT_SCROLL_CUE_FADE_DISTANCE_PX
  );
  const cueFadeFactor = 1 - scrollProgress;
  const cueDisplayOpacity = cueFadeFactor * ASSISTANT_SCROLL_CUE_MAX_OPACITY;
  const isCueInvisible = cueDisplayOpacity < 0.02;

  const isDarkMode = theme.palette.mode === "dark";

  const borderColor = isDarkMode
    ? alpha(theme.palette.common.white, ASSISTANT_SCROLL_CUE_BORDER_ALPHA_DARK)
    : alpha(
        theme.palette.common.black,
        ASSISTANT_SCROLL_CUE_BORDER_ALPHA_LIGHT
      );

  const fillColor = isDarkMode
    ? alpha(theme.palette.grey[800], ASSISTANT_SCROLL_CUE_FILL_ALPHA)
    : alpha(theme.palette.grey[100], ASSISTANT_SCROLL_CUE_FILL_ALPHA);

  return (
    <Box
      component="button"
      type="button"
      onClick={scrollToFirstSection}
      disabled={isCueInvisible}
      aria-hidden={isCueInvisible}
      {...(!isCueInvisible ? { "aria-label": t("scrollDownCue") } : {})}
      sx={{
        appearance: "none",
        WebkitAppearance: "none",
        border: "none",
        margin: 0,
        padding: 0,
        background: "transparent",
        cursor: isCueInvisible ? "default" : "pointer",
        pointerEvents: isCueInvisible ? "none" : "auto",
        position: "fixed",
        left: "50%",
        bottom: "env(safe-area-inset-bottom, 0px)",
        transform: "translate(-50%, 50%)",
        zIndex: 8,
        width: CUE_WIDTH_PX,
        height: CUE_WIDTH_PX,
        opacity: cueDisplayOpacity,
        visibility: isCueInvisible ? "hidden" : "visible",
        transition: "opacity 0.2s ease-out, visibility 0.2s ease-out",
        "&:focus-visible": {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          bgcolor: fillColor,
          border: `1px solid ${borderColor}`,
          boxSizing: "border-box",
          boxShadow: isDarkMode
            ? `0 2px 10px ${alpha(theme.palette.common.black, ASSISTANT_SCROLL_CUE_SHADOW_ALPHA_DARK)}`
            : `0 2px 8px ${alpha(theme.palette.common.black, ASSISTANT_SCROLL_CUE_SHADOW_ALPHA_LIGHT)}`,
        }}
      />
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          height: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <KeyboardArrowDownRoundedIcon
          sx={{
            fontSize: 20,
            transform: `translateY(${ASSISTANT_SCROLL_CUE_CHEVRON_OFFSET_Y_PX}px)`,
            color: alpha(
              isDarkMode ? theme.palette.grey[100] : theme.palette.grey[900],
              ASSISTANT_SCROLL_CUE_CHEVRON_OPACITY
            ),
          }}
        />
      </Box>
    </Box>
  );
}
