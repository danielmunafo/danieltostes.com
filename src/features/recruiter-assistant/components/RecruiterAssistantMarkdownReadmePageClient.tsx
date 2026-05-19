"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { isValidLocale, type Locale } from "@/i18n/request";
import { useScrollToLocationHashWhenReady } from "@/hooks/useScrollToLocationHashWhenReady";
import { PROFESSIONAL_CONTEXT_SCROLL_TARGET_PREFIX } from "../constants/recruiter-assistant";
import { createPortfolioDeepLinkMarkdownComponents } from "../lib/createPortfolioDeepLinkMarkdownComponents";

const markdownSx = {
  "& p": { mb: 1.5, "&:last-child": { mb: 0 } },
  "& ul, & ol": { pl: 2.5, my: 1 },
  "& ul ul, & ol ol": { pl: 2.5, my: 0.5 },
  "& li": { mb: 0.5 },
  "& code": {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "0.875em",
    px: 0.5,
    py: 0.125,
    borderRadius: 0.5,
    bgcolor: "action.hover",
    whiteSpace: "normal",
    wordBreak: "break-word",
  },
  "& h1": {
    mt: 0,
    mb: 2,
    fontWeight: 700,
    fontSize: "1.5rem",
    lineHeight: 1.25,
  },
  "& h2": {
    mt: 3,
    mb: 1.25,
    fontWeight: 600,
    fontSize: "1.0625rem",
    letterSpacing: "0.02em",
    "&:first-of-type": { mt: 2 },
  },
  "& strong": { fontWeight: 600 },
  "& a": { color: "primary.main" },
} as const;

export type RecruiterAssistantReadmeNamespace =
  | "RecruiterAssistantTerms"
  | "RecruiterAssistantProfessionalContext";

type RecruiterAssistantMarkdownReadmePageClientProps = {
  readonly locale: Locale;
  readonly contentUrl: (contentLocale: Locale) => string;
  readonly i18nNamespace: RecruiterAssistantReadmeNamespace;
  readonly logTag: string;
  readonly assignH2SectionAnchors?: boolean;
};

function createReadmeMarkdownComponents(
  contentLocale: Locale,
  assignH2SectionAnchors: boolean
): Partial<Components> {
  const base = createPortfolioDeepLinkMarkdownComponents(contentLocale);
  if (!assignH2SectionAnchors) return base;

  let h2Index = -1;
  return {
    ...base,
    h2({ children, id: propsId, ...props }) {
      h2Index += 1;
      const id =
        propsId ?? `${PROFESSIONAL_CONTEXT_SCROLL_TARGET_PREFIX}-${h2Index}`;
      return (
        <h2 id={id} {...props}>
          {children}
        </h2>
      );
    },
  };
}

type ReadmeMarkdownBodyProps = {
  readonly contentLocale: Locale;
  readonly contentUrl: string;
  readonly i18nNamespace: RecruiterAssistantReadmeNamespace;
  readonly logTag: string;
  readonly assignH2SectionAnchors: boolean;
};

function RecruiterAssistantReadmeMarkdownBody({
  contentLocale,
  contentUrl,
  i18nNamespace,
  logTag,
  assignH2SectionAnchors,
}: ReadmeMarkdownBodyProps) {
  const theme = useTheme();
  const t = useTranslations(i18nNamespace);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const markdownComponents = useMemo(
    () => createReadmeMarkdownComponents(contentLocale, assignH2SectionAnchors),
    [contentLocale, assignH2SectionAnchors]
  );

  useEffect(() => {
    let cancelled = false;
    void fetch(contentUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`${logTag} fetch failed (${response.status})`);
        }
        return response.text();
      })
      .then((text) => {
        if (!cancelled) {
          setMarkdown(text);
          setLoadError(false);
        }
      })
      .catch((err) => {
        console.error(`[${logTag}] failed to load ${contentUrl}`, err);
        if (!cancelled) {
          setLoadError(true);
          setMarkdown(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [contentUrl, logTag]);

  const isLoading = !loadError && markdown === null;
  const isMarkdownReady = markdown !== null && !loadError;
  useScrollToLocationHashWhenReady(isMarkdownReady);

  const mutedBorder =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.white, 0.12)
      : alpha(theme.palette.common.black, 0.1);

  return (
    <>
      {loadError ? (
        <Typography color="error" variant="body1">
          {t("loadError")}
        </Typography>
      ) : null}

      {!loadError && isLoading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            py: 6,
          }}
          aria-busy="true"
        >
          <CircularProgress size={32} aria-label={t("loading")} />
        </Box>
      ) : null}

      {markdown ? (
        <Box
          component="article"
          sx={{
            mt: 1,
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            border: `1px solid ${mutedBorder}`,
            bgcolor:
              theme.palette.mode === "dark"
                ? alpha(theme.palette.common.white, 0.03)
                : alpha(theme.palette.common.black, 0.02),
            color: "text.primary",
            lineHeight: 1.72,
            ...markdownSx,
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {markdown}
          </ReactMarkdown>
        </Box>
      ) : null}
    </>
  );
}

export function RecruiterAssistantMarkdownReadmePageClient({
  locale: routeLocale,
  contentUrl,
  i18nNamespace,
  logTag,
  assignH2SectionAnchors = false,
}: RecruiterAssistantMarkdownReadmePageClientProps) {
  const nextIntlLocale = useLocale();
  const t = useTranslations(i18nNamespace);
  const contentLocale = useMemo((): Locale => {
    return isValidLocale(nextIntlLocale) ? nextIntlLocale : routeLocale;
  }, [nextIntlLocale, routeLocale]);

  const resolvedContentUrl = contentUrl(contentLocale);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
      <Button
        component={NextLink}
        href={`/${contentLocale}`}
        startIcon={<ArrowBackRoundedIcon />}
        variant="text"
        color="inherit"
        sx={{ mb: 2, px: 0 }}
      >
        {t("backToHome")}
      </Button>

      <RecruiterAssistantReadmeMarkdownBody
        key={`${contentLocale}-${assignH2SectionAnchors}`}
        contentLocale={contentLocale}
        contentUrl={resolvedContentUrl}
        i18nNamespace={i18nNamespace}
        logTag={logTag}
        assignH2SectionAnchors={assignH2SectionAnchors}
      />
    </Container>
  );
}
