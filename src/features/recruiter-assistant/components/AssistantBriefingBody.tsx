"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import type { SxProps, Theme } from "@mui/material/styles";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createPortfolioDeepLinkMarkdownComponents } from "../lib/createPortfolioDeepLinkMarkdownComponents";
import { RECRUITER_ASSISTANT_SECTION_BLOCK_GAP } from "../constants/recruiter-assistant";
import type { ChartData } from "../lib/chart-data-types";
import { extractScoresReasonAndStripScoresSection } from "../lib/extractScoresReasonFromPitchMarkdown";
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

  const {
    pitchForRender,
    referencesMarkdown,
    scoresReasonForProfile,
    hasPitchContent,
  } = useMemo(() => {
    const hasContent = markdown.trim().length > 0;
    const split = hasContent
      ? splitPitchAndReferencesMarkdown(markdown, locale)
      : { pitchMarkdown: "", referencesMarkdown: null as string | null };

    let pitchForRender = split.pitchMarkdown;
    let scoresReasonForProfile: string | null = null;
    if (chartData && split.pitchMarkdown.trim()) {
      const extracted = extractScoresReasonAndStripScoresSection(
        split.pitchMarkdown,
        locale
      );
      pitchForRender = extracted.pitchMarkdown;
      scoresReasonForProfile = extracted.scoresReason;
    }

    return {
      pitchForRender,
      referencesMarkdown: split.referencesMarkdown,
      scoresReasonForProfile,
      hasPitchContent: hasContent,
    };
  }, [chartData, markdown, locale]);

  if (!hasPitchContent && !chartData) {
    return null;
  }

  return (
    <Stack spacing={RECRUITER_ASSISTANT_SECTION_BLOCK_GAP}>
      {chartData ? (
        <AssistantMatchProfile
          chartData={chartData}
          scoresReason={scoresReasonForProfile}
        />
      ) : null}
      {pitchForRender.trim() ? (
        <Box sx={contentSx}>
          <ReactMarkdown
            remarkPlugins={BRIEFING_REMARK_PLUGINS}
            components={markdownLinkComponents}
          >
            {pitchForRender}
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
