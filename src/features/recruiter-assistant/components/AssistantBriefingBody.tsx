"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import type { SxProps, Theme } from "@mui/material/styles";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createPortfolioDeepLinkMarkdownComponents } from "../lib/createPortfolioDeepLinkMarkdownComponents";
import type { ChartData } from "../lib/chart-data-types";
import { splitPitchAndReferencesMarkdown } from "../lib/split-briefing-markdown";
import { AssistantCollapsiblePanel } from "./AssistantCollapsiblePanel";
import { AssistantMatchProfile } from "./AssistantMatchProfile";

const BRIEFING_REMARK_PLUGINS = [remarkGfm];

const referencesPanelBodyMarkdownSx = {
  fontSize: "0.8125rem",
  lineHeight: 1.55,
  "& p": { mb: 0.75, "&:last-child": { mb: 0 } },
  "& ul, & ol": { pl: 2, my: 0.5 },
  "& li": { mb: 0.25 },
  "& h1, & h2, & h3": {
    mt: 1.25,
    mb: 0.5,
    fontWeight: 600,
    fontSize: "0.875rem",
  },
  "& a": { color: "primary.main" },
} as const;

type AssistantBriefingBodyProps = {
  readonly markdown: string;
  readonly contentSx: SxProps<Theme>;
  /** Active UI locale for portfolio `/<locale>#…` link rewriting in markdown. */
  readonly locale: string;
  /** Panel title for the post-stream `## References` block when present. */
  readonly referencesPanelTitle: string;
  /** Validated match profile from chart marker block; omitted when skipped or streaming. */
  readonly chartData?: ChartData | null;
};

/** Strips the first `## Title` line so the collapsible panel supplies the title. */
function stripFirstH2Heading(markdown: string): string {
  return markdown.replace(/^##[^\n]*\n+/, "").trim();
}

export function AssistantBriefingBody({
  markdown,
  contentSx,
  locale,
  referencesPanelTitle,
  chartData = null,
}: AssistantBriefingBodyProps) {
  const markdownLinkComponents = useMemo(
    () => createPortfolioDeepLinkMarkdownComponents(locale),
    [locale]
  );

  const [referencesOpen, setReferencesOpen] = useState(false);

  const hasPitchMarkdown = markdown.trim().length > 0;
  if (!hasPitchMarkdown && !chartData) {
    return null;
  }

  const { pitchMarkdown, referencesMarkdown } = hasPitchMarkdown
    ? splitPitchAndReferencesMarkdown(markdown, locale)
    : { pitchMarkdown: "", referencesMarkdown: "" };

  return (
    <Stack spacing={1.5}>
      {chartData ? <AssistantMatchProfile chartData={chartData} /> : null}
      {pitchMarkdown.trim() ? (
        <Box sx={contentSx}>
          <ReactMarkdown
            remarkPlugins={BRIEFING_REMARK_PLUGINS}
            components={markdownLinkComponents}
          >
            {pitchMarkdown}
          </ReactMarkdown>
        </Box>
      ) : null}
      {referencesMarkdown ? (
        <AssistantCollapsiblePanel
          title={referencesPanelTitle}
          open={referencesOpen}
          onToggle={() => setReferencesOpen((v) => !v)}
          bodySx={[
            referencesPanelBodyMarkdownSx,
            ...(Array.isArray(contentSx) ? contentSx : [contentSx]),
          ]}
        >
          <ReactMarkdown
            remarkPlugins={BRIEFING_REMARK_PLUGINS}
            components={markdownLinkComponents}
          >
            {stripFirstH2Heading(referencesMarkdown)}
          </ReactMarkdown>
        </AssistantCollapsiblePanel>
      ) : null}
    </Stack>
  );
}
