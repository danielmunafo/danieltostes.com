"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createPortfolioDeepLinkMarkdownComponents } from "../lib/createPortfolioDeepLinkMarkdownComponents";
import { AssistantCollapsiblePanel } from "./AssistantCollapsiblePanel";

const EVIDENCE_REMARK_PLUGINS = [remarkGfm];

const EVIDENCE_REVIEW_PULSE_DURATION_MS = 1400;

const pulseAnimation = keyframes`
  0% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
  100% { opacity: 0.35; transform: scale(0.85); }
`;

const evidenceMarkdownSx = {
  fontSize: "0.8125rem",
  lineHeight: 1.55,
  "& p": { mb: 0.75, "&:last-child": { mb: 0 } },
  "& ul, & ol": { pl: 2, my: 0.5 },
  "& li": { mb: 0.25 },
  "& a": { color: "primary.main" },
  "& h1, & h2, & h3": {
    mt: 1.25,
    mb: 0.5,
    fontWeight: 600,
    fontSize: "0.8125rem",
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
  readonly label: string;
  readonly streamingLabel: string;
  /** Active UI locale; used to rewrite same-site `/<locale>#…` reference links. */
  readonly locale: string;
}

function AssistantEvidenceReviewInner({
  content,
  isStreaming,
  label,
  streamingLabel,
  locale: localeProp,
}: AssistantEvidenceReviewProps) {
  /** Default open so mounted-after-stream still shows evidence; user may collapse. */
  const [open, setOpen] = useState(true);
  const streamingBodyScrollRef = useRef<HTMLDivElement>(null);

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

  const headerLabel = isStreaming ? streamingLabel : label;
  const markdownLinkComponents = useMemo(
    () => createPortfolioDeepLinkMarkdownComponents(localeProp),
    [localeProp]
  );

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
      bodySx={[
        evidenceMarkdownSx,
        ...(isStreaming
          ? [
              {
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
              },
            ]
          : []),
      ]}
    >
      {content.trim() === "" ? (
        <Typography variant="body2" component="span" sx={{ opacity: 0.7 }}>
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
