"use client";

import Typography from "@mui/material/Typography";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { recruiterAssistantPanelBodyScrollSx } from "../lib/recruiter-assistant-panel-body-sx";
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
  const [open, setOpen] = useState(() => !collapseRequested);
  const didAutoCollapseRef = useRef(collapseRequested);
  /** User expanded after mount; do not override when evidence streaming begins. */
  const userExpandedRef = useRef(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!collapseRequested || didAutoCollapseRef.current) return;
    didAutoCollapseRef.current = true;
    if (userExpandedRef.current) return;
    setOpen(false);
  }, [collapseRequested]);

  const handleToggle = useCallback(() => {
    setOpen((previousOpen) => {
      const nextOpen = !previousOpen;
      if (nextOpen) {
        userExpandedRef.current = true;
      }
      return nextOpen;
    });
  }, []);

  return (
    <AssistantCollapsiblePanel
      title={label}
      open={open}
      onToggle={handleToggle}
      bodySx={[recruiterAssistantPanelBodyScrollSx]}
    >
      <Typography
        component="div"
        sx={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: "inherit",
          lineHeight: "inherit",
        }}
      >
        {content}
      </Typography>
    </AssistantCollapsiblePanel>
  );
}

export const AssistantJobContextPanel = memo(AssistantJobContextPanelInner);
