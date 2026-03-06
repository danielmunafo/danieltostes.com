"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Fuse from "fuse.js";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import {
  BORDER_BY_MODE,
  GLASS_BG_BY_MODE,
  TEXT_ON_GLASS_BY_MODE,
} from "@/constants/site";
import { GLASS_BLUR } from "@/constants/sections";
import type { SearchIndexEntry } from "@/hooks/useSearchIndex";
import { useSearchIndex } from "@/hooks/useSearchIndex";

const FUSE_OPTIONS = {
  keys: ["title", "text"],
  threshold: 0.4,
  isCaseSensitive: false,
  ignoreLocation: true,
};

const MAX_RESULTS = 8;

/** Search shortcut label: ⌘F on Mac, Ctrl+F on Windows/Linux. */
function useSearchShortcutLabel(): string {
  const [label, setLabel] = useState("Ctrl+F");
  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const next = isMac ? "⌘F" : "Ctrl+F";
    const id = requestAnimationFrame(() => setLabel(next));
    return () => cancelAnimationFrame(id);
  }, []);
  return label;
}

function scrollToTarget(scrollTargetId: string): void {
  const el = document.getElementById(scrollTargetId);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function SearchBar() {
  const locale = useLocale() as "en" | "pt-BR" | "es" | "it";
  const t = useTranslations("Search");
  const { entries, loading, available } = useSearchIndex(locale);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const shortcutLabel = useSearchShortcutLabel();

  const fuse = useMemo(() => new Fuse(entries, FUSE_OPTIONS), [entries]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const qLower = q.toLowerCase();
    const raw = fuse.search(q);
    return raw
      .filter(
        (r) =>
          (r.item.title && r.item.title.toLowerCase().includes(qLower)) ||
          (r.item.text && r.item.text.toLowerCase().includes(qLower))
      )
      .slice(0, MAX_RESULTS)
      .map((r) => r.item);
  }, [fuse, query]);

  const showDropdown =
    open && (query.length > 0 || results.length > 0 || loading);
  const hasResults = results.length > 0;

  const selectResult = useCallback((entry: SearchIndexEntry) => {
    scrollToTarget(entry.scrollTargetId);
    setQuery("");
    setOpen(false);
    setHighlightedIndex(0);
    inputRef.current?.blur();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const highlightedIndexClamped = Math.min(
    highlightedIndex,
    Math.max(0, results.length - 1)
  );
  const effectiveHighlightedIndex =
    results.length > 0 ? highlightedIndexClamped : 0;

  useEffect(() => {
    if (!showDropdown || !listRef.current) return;
    const item = listRef.current.children[highlightedIndex] as
      | HTMLElement
      | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, showDropdown]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === "Escape") inputRef.current?.blur();
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowUp") {
      setHighlightedIndex((i) => Math.max(0, i - 1));
      e.preventDefault();
      return;
    }
    if (e.key === "Enter" && results[effectiveHighlightedIndex]) {
      selectResult(results[effectiveHighlightedIndex]);
      e.preventDefault();
    }
  };

  if (!available) return null;

  return (
    <Box
      sx={{
        position: "relative",
        flexShrink: 0,
        width: 320,
        maxWidth: "40vw",
        display: { xs: "none", sm: "block" },
      }}
    >
      <TextField
        inputRef={inputRef}
        size="small"
        fullWidth
        placeholder={t("placeholder")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlightedIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 200);
        }}
        onKeyDown={handleKeyDown}
        slotProps={{
          htmlInput: {
            autoComplete: "off",
            "aria-label": t("ariaLabel"),
            "aria-expanded": showDropdown,
            "aria-autocomplete": "list" as const,
            "aria-controls": "search-results-list",
            "aria-activedescendant":
              showDropdown && results[effectiveHighlightedIndex]
                ? `search-result-${effectiveHighlightedIndex}`
                : undefined,
          },
          input: {
            startAdornment: (
              <InputAdornment
                position="start"
                sx={{ color: "inherit", opacity: 0.8 }}
              >
                <Typography
                  component="span"
                  sx={{ fontSize: "1rem" }}
                  aria-hidden
                >
                  {shortcutLabel}
                </Typography>
              </InputAdornment>
            ),
          },
        }}
        sx={(theme) => {
          const mode = theme.palette.mode;
          return {
            "& .MuiOutlinedInput-root": {
              backgroundColor: GLASS_BG_BY_MODE[mode],
              color: TEXT_ON_GLASS_BY_MODE[mode],
              borderRadius: 2,
              "& fieldset": {
                borderColor: BORDER_BY_MODE[mode],
              },
              "&:hover fieldset": {
                borderColor: BORDER_BY_MODE[mode],
              },
            },
          };
        }}
      />
      {showDropdown && (
        <List
          id="search-results-list"
          ref={listRef}
          role="listbox"
          sx={(theme) => {
            const mode = theme.palette.mode;
            return {
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              mt: 0.5,
              py: 0,
              maxHeight: 320,
              overflow: "auto",
              backgroundColor: GLASS_BG_BY_MODE[mode],
              backdropFilter: `blur(${GLASS_BLUR}px)`,
              WebkitBackdropFilter: `blur(${GLASS_BLUR}px)`,
              border: `1px solid ${BORDER_BY_MODE[mode]}`,
              borderRadius: 2,
              boxShadow: theme.shadows[4],
              zIndex: theme.zIndex.appBar + 1,
            };
          }}
        >
          {hasResults ? (
            results.map((entry, i) => (
              <ListItemButton
                key={`${entry.scrollTargetId}-${i}`}
                id={`search-result-${i}`}
                role="option"
                aria-selected={i === effectiveHighlightedIndex}
                selected={i === effectiveHighlightedIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectResult(entry);
                }}
                sx={{ py: 1 }}
              >
                <ListItemText
                  primary={entry.title || entry.sectionId}
                  secondary={
                    (entry.text || "").slice(0, 80) +
                    ((entry.text || "").length > 80 ? "…" : "")
                  }
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            ))
          ) : loading ? (
            <ListItemButton disabled sx={{ py: 2 }}>
              <ListItemText primary={t("loading")} />
            </ListItemButton>
          ) : (
            <ListItemButton disabled sx={{ py: 2 }}>
              <ListItemText primary={t("noResults")} />
            </ListItemButton>
          )}
        </List>
      )}
    </Box>
  );
}
