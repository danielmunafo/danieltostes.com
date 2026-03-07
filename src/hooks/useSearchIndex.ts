"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/request";

export interface SearchIndexEntry {
  sectionId: string;
  scrollTargetId: string;
  title: string;
  text: string;
  itemIndex?: number;
}

export type SearchIndexByLocale = Record<Locale, SearchIndexEntry[]>;

const INDEX_URL = "/search-index.json";
let cachedIndex: SearchIndexByLocale | null = null;

export type UseSearchIndexResult = {
  entries: SearchIndexEntry[];
  loading: boolean;
  /** False when the index failed to load; search UI should not be displayed. */
  available: boolean;
};

/**
 * Loads the search index JSON once and exposes entries by locale.
 * Used by the search bar for fuzzy matching and scroll targets.
 */
export function useSearchIndex(locale: Locale): UseSearchIndexResult {
  const [index, setIndex] = useState<SearchIndexByLocale | null>(
    () => cachedIndex
  );
  const [loading, setLoading] = useState(() => !cachedIndex);
  const [available, setAvailable] = useState(() => true);

  useEffect(() => {
    if (cachedIndex) return;
    fetch(INDEX_URL)
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(new Error("Failed to load search index"))
      )
      .then((data: SearchIndexByLocale) => {
        cachedIndex = data;
        setIndex(data);
        setLoading(false);
        setAvailable(true);
      })
      .catch(() => {
        setIndex(null);
        setLoading(false);
        setAvailable(false);
      });
  }, []);

  const entries = !index || !index[locale] ? [] : index[locale];
  return { entries, loading, available };
}
