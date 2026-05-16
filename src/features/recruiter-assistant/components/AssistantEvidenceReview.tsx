"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createPortfolioDeepLinkMarkdownComponents } from "../lib/createPortfolioDeepLinkMarkdownComponents";
import {
  recruiterAssistantPanelBodyScrollSx,
  recruiterAssistantPanelBodyTypographyScrollSx,
} from "../lib/recruiter-assistant-panel-body-sx";
import { RECRUITER_ASSISTANT_PANEL_BODY_FONT_REM } from "../constants/recruiter-assistant";
import { AssistantCollapsiblePanel } from "./AssistantCollapsiblePanel";

const EVIDENCE_REMARK_PLUGINS = [remarkGfm];

const EVIDENCE_REVIEW_PULSE_DURATION_MS = 1400;

const pulseAnimation = keyframes`
  0% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
  100% { opacity: 0.35; transform: scale(0.85); }
`;

const evidenceMarkdownSx = {
  "& p": { mb: 0.75, "&:last-child": { mb: 0 } },
  "& ul, & ol": { pl: 2, my: 0.5 },
  "& li": { mb: 0.25 },
  "& a": { color: "primary.main" },
  "& h1, & h2, & h3": {
    mt: 1.25,
    mb: 0.5,
    fontWeight: 600,
    fontSize: `${RECRUITER_ASSISTANT_PANEL_BODY_FONT_REM}rem`,
    color: "text.secondary",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    "&:first-of-type": { mt: 0 },
  },
  "& table": {
    width: "100%",
    borderCollapse: "collapse" as const,
    my: 1,
    fontSize: "0.75rem",
  },
  "& th, & td": {
    border: 1,
    borderColor: "divider",
    px: 0.75,
    py: 0.5,
    textAlign: "left" as const,
  },
} as const;

interface AssistantEvidenceReviewProps {
  readonly content: string;
  readonly isStreaming: boolean;
  /**
   * When true, the panel animates shut (same milestone pattern as job context:
   * parent sets this once the evidence brief stream has finished while the
   * overall assistant response may still be streaming).
   */
  readonly collapseRequested: boolean;
  readonly label: string;
  readonly streamingLabel: string;
  /** Active UI locale; used to rewrite same-site `/<locale>#…` reference links. */
  readonly locale: string;
  /** Parent may track open state for layout (`fillColumn` height). */
  readonly onOpenChange?: (open: boolean) => void;
  /** True only while briefing below is prep/skeleton gaps (avoids flex overlap). */
  readonly fillColumn?: boolean;
}

function AssistantEvidenceReviewInner({
  content,
  isStreaming,
  collapseRequested,
  label,
  streamingLabel,
  locale: localeProp,
  onOpenChange,
  fillColumn = false,
}: AssistantEvidenceReviewProps) {
  /** Default open; auto-collapse when `collapseRequested` (see job-context panel). */
  const [open, setOpen] = useState(() => !collapseRequested);
  const didAutoCollapseRef = useRef(collapseRequested);
  const streamingBodyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!collapseRequested || didAutoCollapseRef.current) return;
    didAutoCollapseRef.current = true;
    setOpen(false);
  }, [collapseRequested]);

  useEffect(() => {
    if (!isStreaming) return;
    const el = streamingBodyScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [content, isStreaming]);

  useEffect(() => {
    if (!isStreaming) return;
    queueMicrotask(() => {
      setOpen(true);
    });
  }, [isStreaming]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const headerLabel = isStreaming ? streamingLabel : label;
  const markdownLinkComponents = useMemo(
    () => createPortfolioDeepLinkMarkdownComponents(localeProp),
    [localeProp]
  );

  const panelBodyScrollSx = fillColumn
    ? recruiterAssistantPanelBodyTypographyScrollSx
    : recruiterAssistantPanelBodyScrollSx;

  return (
    <AssistantCollapsiblePanel
      title={headerLabel}
      open={open}
      onToggle={() => setOpen((v) => !v)}
      disableCollapseAnimation={isStreaming}
      headerStartSlot={
        isStreaming ? (
          <Box
            aria-hidden
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "primary.main",
              animation: `${pulseAnimation} ${EVIDENCE_REVIEW_PULSE_DURATION_MS}ms ease-in-out infinite`,
            }}
          />
        ) : undefined
      }
      bodyRef={isStreaming ? streamingBodyScrollRef : undefined}
      fillColumn={fillColumn}
      bodySx={[panelBodyScrollSx, evidenceMarkdownSx]}
    >
      {content.trim() === "" ? (
        <Typography
          variant="body2"
          component="span"
          sx={{
            opacity: 0.7,
            fontSize: "inherit",
            lineHeight: "inherit",
          }}
        >
          {streamingLabel}
        </Typography>
      ) : (
        <ReactMarkdown
          remarkPlugins={EVIDENCE_REMARK_PLUGINS}
          components={markdownLinkComponents}
        >
          {content}
        </ReactMarkdown>
      )}
    </AssistantCollapsiblePanel>
  );
}

export const AssistantEvidenceReview = memo(AssistantEvidenceReviewInner);
