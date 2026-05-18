"use client";

import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { useTranslations } from "next-intl";

const BRIEFING_SKELETON_LINE_HEIGHT_PX = 20;
const BRIEFING_SKELETON_LINE_SPACING = 1.35;
const BRIEFING_SKELETON_BORDER_RADIUS_PX = 8;
const BRIEFING_SKELETON_LINE_WIDTHS = ["100%", "94%", "88%", "72%"] as const;

export function AssistantThinkingIndicator() {
  const t = useTranslations("RecruiterAssistant");

  return (
    <Stack
      role="status"
      aria-busy="true"
      aria-label={t("sending")}
      spacing={BRIEFING_SKELETON_LINE_SPACING}
      sx={{ width: "100%", py: 0.5 }}
    >
      {BRIEFING_SKELETON_LINE_WIDTHS.map((width, index) => (
        <Skeleton
          key={width}
          variant="rounded"
          width={width}
          height={BRIEFING_SKELETON_LINE_HEIGHT_PX}
          animation="wave"
          sx={{
            borderRadius: `${BRIEFING_SKELETON_BORDER_RADIUS_PX}px`,
            maxWidth: "100%",
            opacity: 0.55 - index * 0.06,
          }}
        />
      ))}
    </Stack>
  );
}
