"use client";

import { useId, useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import mermaid from "mermaid";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { BORDER_BY_MODE } from "@/constants/site";
import {
  GLASS_ALPHA,
  GLASS_BLUR,
  hexToRgba,
  SECTION_COLORS,
} from "@/constants/sections";

const CONTENT_BASE = "/content";
const SECTION_ID = "impact" as const;

const markdownComponents: Components = {
  p: ({ children }) => (
    <Typography variant="body1" component="p" paragraph>
      {children}
    </Typography>
  ),
  h1: ({ children }) => (
    <Typography
      variant="h4"
      component="h1"
      gutterBottom
      sx={{ fontWeight: 700 }}
    >
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography
      variant="h5"
      component="h2"
      gutterBottom
      sx={{ fontWeight: 700 }}
    >
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography
      variant="h6"
      component="h3"
      gutterBottom
      sx={{ fontWeight: 700 }}
    >
      {children}
    </Typography>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ pl: 3, my: 1 }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ pl: 3, my: 1 }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Typography variant="body1" component="li">
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <Link
      href={href ?? ""}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
    >
      {children}
    </Link>
  ),
};

function mermaidSourceFromChildren(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children))
    return children.map((c) => (typeof c === "string" ? c : "")).join("");
  return String(children ?? "");
}

/**
 * Renders a Mermaid diagram from markdown fenced code (```mermaid).
 * Clicking the diagram opens a fullscreen view.
 */
function MermaidBlock({ children }: { children: React.ReactNode }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandOpen, setExpandOpen] = useState(false);
  const source = mermaidSourceFromChildren(children);

  useEffect(() => {
    let cancelled = false;
    mermaid.initialize({ startOnLoad: false });
    const uniqueId = `mermaid-${id}`;
    mermaid
      .render(uniqueId, source)
      .then(({ svg: s }) => {
        if (!cancelled) setSvg(s);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Diagram failed to render");
      });
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ my: 1 }}>
        {error}
      </Typography>
    );
  }
  if (!svg) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
        Loading diagram…
      </Typography>
    );
  }

  const diagramBox = (
    <Box
      sx={{
        overflow: "auto",
        my: 2,
        "& svg": { maxWidth: "100%" },
        cursor: "pointer",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        "&:hover": { bgcolor: "action.hover" },
      }}
      onClick={() => setExpandOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpandOpen(true);
        }
      }}
      aria-label="Expand diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );

  return (
    <>
      {diagramBox}
      <Dialog
        open={expandOpen}
        onClose={() => setExpandOpen(false)}
        fullScreen
        slotProps={{
          backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.85)" } },
          paper: {
            sx: {
              backgroundColor: "background.paper",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
            },
          },
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 1200,
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto",
            "& svg": { maxWidth: "100%", height: "auto" },
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
          onClick={() => setExpandOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Escape") setExpandOpen(false);
          }}
          aria-label="Close expanded diagram"
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Click or press Escape to close
        </Typography>
      </Dialog>
    </>
  );
}

const markdownComponentsWithMermaid: Components = {
  ...markdownComponents,
  code: ({ className, children, ...props }) => {
    const inline = "inline" in props && (props as { inline?: boolean }).inline;
    const codeString = mermaidSourceFromChildren(children);
    if (inline) {
      return (
        <Typography
          component="code"
          variant="body1"
          sx={{ fontFamily: "monospace" }}
          {...props}
        >
          {children}
        </Typography>
      );
    }
    if (className?.includes("language-mermaid")) {
      return <MermaidBlock>{codeString}</MermaidBlock>;
    }
    return (
      <Box
        component="pre"
        sx={{
          overflow: "auto",
          py: 1,
          px: 2,
          bgcolor: "action.hover",
          borderRadius: 1,
        }}
      >
        <Typography
          component="code"
          variant="body2"
          sx={{ fontFamily: "monospace", whiteSpace: "pre" }}
          {...props}
        >
          {children}
        </Typography>
      </Box>
    );
  },
};

/** Splits content into main markdown and the last non-empty line (tech stack). */
function splitContentAndTechStack(raw: string): {
  markdown: string;
  techItems: string[];
} {
  const lines = raw.split(/\r?\n/);
  const nonEmpty: string[] = [];
  let lastNonEmptyIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      nonEmpty.push(lines[i]);
      lastNonEmptyIndex = i;
    }
  }
  if (lastNonEmptyIndex < 0) {
    return { markdown: raw, techItems: [] };
  }
  const techLine = lines[lastNonEmptyIndex].trim();
  const techItems = techLine
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const markdownLines = lines.slice(0, lastNonEmptyIndex);
  const markdown = markdownLines.join("\n").trimEnd();
  return { markdown, techItems };
}

export function contentUrl(bodyPath: string, locale: string): string {
  const base = bodyPath.replace(/^\//, "").replace(/\.md$/i, "");
  return `${CONTENT_BASE}/${base}/${locale}.md`;
}

export interface ImpactDetailDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Plain or Markdown string; used when bodyPath is not set or as fallback. */
  body: string;
  /** Base path under public/content (e.g. "impact/0"); fetched as {bodyPath}/{locale}.md. */
  bodyPath?: string;
  /** Current locale for fetching the translated .md (e.g. en, pt-BR). */
  locale: string;
  /** Prefetched markdown when available (e.g. from hover); avoids fetch when dialog opens. */
  prefetchedBody?: string | null;
  closeLabel: string;
}

export function ImpactDetailDialog({
  open,
  onClose,
  title,
  body,
  bodyPath,
  locale,
  prefetchedBody,
  closeLabel,
}: ImpactDetailDialogProps) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const solidColor = SECTION_COLORS[mode][SECTION_ID];
  const glassColor = hexToRgba(solidColor, GLASS_ALPHA);

  const [fetchedBody, setFetchedBody] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasPrefetched = Boolean(bodyPath && prefetchedBody);
  const isLoading = Boolean(
    bodyPath && open && !hasPrefetched && fetchedBody === null && !loadError
  );

  useEffect(() => {
    if (!open || !bodyPath || hasPrefetched) return;
    const url = contentUrl(bodyPath, locale);
    let cancelled = false;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setFetchedBody(text);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
      setFetchedBody(null);
      setLoadError(null);
    };
  }, [open, bodyPath, locale, hasPrefetched]);

  const content = bodyPath ? (prefetchedBody ?? fetchedBody ?? body) : body;

  const { markdown, techItems } = content
    ? splitContentAndTechStack(content)
    : { markdown: "", techItems: [] };
  const chipBg = hexToRgba(solidColor, 0.25);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: { backgroundColor: "rgba(0,0,0,0.2)" },
        },
        paper: {
          sx: {
            backgroundColor: glassColor,
            backdropFilter: `blur(${GLASS_BLUR}px)`,
            WebkitBackdropFilter: `blur(${GLASS_BLUR}px)`,
            border: `1px solid ${BORDER_BY_MODE[mode]}`,
            padding: 0,
          },
        },
      }}
    >
      <DialogTitle
        variant="h4"
        sx={(theme) => ({
          pt: 6,
          px: 4,
          pb: 2,
          fontWeight: 600,
          [theme.breakpoints.down("md")]: { pt: 3, px: 2 },
        })}
      >
        {title}
      </DialogTitle>
      <DialogContent
        sx={(theme) => ({
          maxHeight: "60vh",
          overflow: "auto",
          px: 4,
          py: 2,
          [theme.breakpoints.down("md")]: { px: 2 },
        })}
      >
        {loadError && (
          <Typography variant="body2" color="error" paragraph>
            {loadError}
          </Typography>
        )}
        {isLoading && (
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        )}
        {!loadError && !isLoading && content && (
          <>
            {markdown && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponentsWithMermaid}
              >
                {markdown}
              </ReactMarkdown>
            )}
            {techItems.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                {techItems.map((label, i) => (
                  <Chip
                    key={i}
                    label={label}
                    size="small"
                    sx={{ backgroundColor: chipBg, color: "inherit" }}
                  />
                ))}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions
        sx={(theme) => ({
          px: 4,
          py: 3,
          pb: 6,
          [theme.breakpoints.down("md")]: { px: 2, py: 2, pb: 3 },
        })}
      >
        <Button onClick={onClose} variant="contained">
          {closeLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
