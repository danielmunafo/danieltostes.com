"use client";

import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { memo, useEffect, useRef, useState } from "react";
import {
  RECRUITER_JOB_CONTEXT_COLLAPSE_DURATION_MS,
  RECRUITER_JOB_CONTEXT_HEADER_MIN_HEIGHT_PX,
} from "../constants/recruiter-assistant";
import { AssistantCollapsiblePanel } from "./AssistantCollapsiblePanel";

interface AssistantJobContextPanelProps {
  readonly content: string;
  readonly label: string;
  /**
   * When true, the panel animates shut. Parent sets this when the assistant
   * stream is about to start (not while the request is still `submitted`).
   */
  readonly collapseRequested: boolean;
  /** Fired when the panel opens or closes (after user toggle or auto-collapse). */
  readonly onOpenChange?: (open: boolean) => void;
}

function AssistantJobContextPanelInner({
  content,
  label,
  collapseRequested,
  onOpenChange,
}: AssistantJobContextPanelProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(() => !collapseRequested);
  const didAutoCollapseRef = useRef(collapseRequested);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!collapseRequested || didAutoCollapseRef.current) return;
    didAutoCollapseRef.current = true;
    setOpen(false);
  }, [collapseRequested]);

  const isDarkMode = theme.palette.mode === "dark";
  const userSurfaceBorder = isDarkMode
    ? alpha(theme.palette.primary.light, 0.38)
    : alpha(theme.palette.primary.main, 0.22);
  const userSurfaceBg = isDarkMode
    ? alpha(theme.palette.common.white, 0.11)
    : alpha(theme.palette.primary.main, 0.07);

  return (
    <AssistantCollapsiblePanel
      title={label}
      open={open}
      onToggle={() => setOpen((v) => !v)}
      alignTitleEnd
      headerButtonSx={{
        minHeight: RECRUITER_JOB_CONTEXT_HEADER_MIN_HEIGHT_PX,
        boxSizing: "border-box",
      }}
      collapseTimeout={{
        enter: RECRUITER_JOB_CONTEXT_COLLAPSE_DURATION_MS,
        exit: RECRUITER_JOB_CONTEXT_COLLAPSE_DURATION_MS,
      }}
      rootSx={{
        borderColor: userSurfaceBorder,
        bgcolor: userSurfaceBg,
        boxShadow: isDarkMode
          ? `0 1px 0 ${alpha(theme.palette.common.white, 0.06)} inset`
          : `0 1px 2px ${alpha(theme.palette.common.black, 0.05)}`,
      }}
      bodySx={{ color: "text.primary", pt: 0.5 }}
    >
      <Typography
        variant="body2"
        sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {content}
      </Typography>
    </AssistantCollapsiblePanel>
  );
}

export const AssistantJobContextPanel = memo(AssistantJobContextPanelInner);
