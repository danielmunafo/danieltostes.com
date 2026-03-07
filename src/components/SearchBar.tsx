"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Fuse from "fuse.js";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import {
  BORDER_BY_MODE,
  GLASS_BG_BY_MODE,
  TEXT_ON_GLASS_BY_MODE,
} from "@/constants/site";
import { GLASS_BLUR, SECTION_IDS } from "@/constants/sections";
import type { Locale } from "@/i18n/request";
import type { SearchIndexEntry } from "@/hooks/useSearchIndex";
import { useSearchIndex } from "@/hooks/useSearchIndex";

const FUSE_OPTIONS = {
  keys: ["title", "text"],
  threshold: 0.4,
  isCaseSensitive: false,
  ignoreLocation: true,
};

const MAX_RESULTS = 8;

function scrollToTarget(scrollTargetId: string): void {
  const el = document.getElementById(scrollTargetId);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function SearchBar() {
  const locale = useLocale() as Locale;
  const t = useTranslations("Search");
  const { entries, loading, available } = useSearchIndex(locale);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fuse = useMemo(() => new Fuse(entries, FUSE_OPTIONS), [entries]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const qLower = q.toLowerCase();
    const raw = fuse.search(q);
    const filtered = raw.filter(
      (r) =>
        (r.item.title && r.item.title.toLowerCase().includes(qLower)) ||
        (r.item.text && r.item.text.toLowerCase().includes(qLower))
    );
    const sectionOrder = (sectionId: string) => {
      const i = SECTION_IDS.indexOf(sectionId as (typeof SECTION_IDS)[number]);
      return i === -1 ? SECTION_IDS.length : i;
    };
    const byRelevance = [...filtered]
      .sort((a, b) => {
        const orderA = sectionOrder(a.item.sectionId);
        const orderB = sectionOrder(b.item.sectionId);
        if (orderA !== orderB) return orderA - orderB;
        return (a.item.itemIndex ?? 0) - (b.item.itemIndex ?? 0);
      })
      .slice(0, MAX_RESULTS)
      .map((r) => r.item);
    return byRelevance;
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

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    },
    []
  );

  const highlightedIndexClamped = Math.min(
    highlightedIndex,
    Math.max(0, results.length - 1)
  );
  const effectiveHighlightedIndex =
    results.length > 0 ? highlightedIndexClamped : 0;

  useEffect(() => {
    if (!showDropdown || !listRef.current) return;
    const item = listRef.current.children[effectiveHighlightedIndex] as
      | HTMLElement
      | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [effectiveHighlightedIndex, showDropdown]);

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
      <Box
        sx={(theme) => {
          const mode = theme.palette.mode;
          const borderColor = BORDER_BY_MODE[mode];
          return {
            width: "100%",
            "& .MuiOutlinedInput-root": {
              backgroundColor: GLASS_BG_BY_MODE[mode],
              color: TEXT_ON_GLASS_BY_MODE[mode],
              borderRadius: 2,
              "& fieldset": {
                borderColor,
              },
              "&.Mui-focused fieldset": {
                borderColor,
              },
            },
            "&:hover .MuiOutlinedInput-root fieldset": {
              borderColor,
            },
          };
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
          onFocus={() => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
            setOpen(true);
          }}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => {
              setOpen(false);
              blurTimeoutRef.current = null;
            }, 200);
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
          }}
          sx={(theme) => {
            const mode = theme.palette.mode;
            return {
              "& .MuiOutlinedInput-root:hover fieldset": {
                borderColor: BORDER_BY_MODE[mode],
              },
            };
          }}
        />
      </Box>
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
