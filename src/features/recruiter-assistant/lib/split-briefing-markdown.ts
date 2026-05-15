export type BriefingSections = {
  readonly intro: string;
  readonly sections: readonly {
    readonly title: string;
    readonly body: string;
  }[];
};

/** `## References` line prefix per UI locale (must match API `RECRUITER_REFERENCES_LABELS`). */
export const RECRUITER_REFERENCE_SECTION_LINE: Record<string, string> = {
  en: "## References",
  "pt-BR": "## Referências",
  es: "## Referencias",
  it: "## Riferimenti",
};

export type PitchAndReferencesSplit = {
  readonly pitchMarkdown: string;
  readonly referencesMarkdown: string | null;
};

/**
 * Separates the streamed pitch from the post-stream `## References` block when present.
 */
export function splitPitchAndReferencesMarkdown(
  markdown: string,
  locale: string
): PitchAndReferencesSplit {
  const trimmed = markdown.trim();
  const refLine = RECRUITER_REFERENCE_SECTION_LINE[locale] ?? "## References";
  const idx = trimmed.indexOf(refLine);
  if (idx === -1) {
    return { pitchMarkdown: trimmed, referencesMarkdown: null };
  }
  return {
    pitchMarkdown: trimmed.slice(0, idx).trim(),
    referencesMarkdown: trimmed.slice(idx).trim(),
  };
}

/**
 * Splits pitch markdown on top-level `#` headings (executive brief), excluding `##`.
 */
export function splitExecutiveBriefMarkdown(
  pitchMarkdown: string
): BriefingSections | null {
  const trimmed = pitchMarkdown.trim();
  if (!trimmed) return null;

  const lines = trimmed.split(/\r?\n/);
  const headingIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^#\s+.+$/.test(line) && !/^##/.test(line)) headingIndices.push(i);
  }
  if (headingIndices.length === 0) return null;

  const intro = lines.slice(0, headingIndices[0]).join("\n").trim();
  const sections: { title: string; body: string }[] = [];

  for (let h = 0; h < headingIndices.length; h++) {
    const start = headingIndices[h];
    const end =
      h + 1 < headingIndices.length ? headingIndices[h + 1] : lines.length;
    const blockLines = lines.slice(start, end);
    const titleLine = blockLines[0].trim();
    const titleMatch = /^#\s+(.+)$/.exec(titleLine);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();
    const body = blockLines.slice(1).join("\n").trim();
    sections.push({ title, body });
  }

  if (sections.length === 0) return null;
  return { intro, sections };
}

/**
 * Splits recruiter briefing markdown on top-level `##` headings when present.
 * Used for card-style rendering after streaming completes (legacy pitch shape).
 */
export function splitBriefingMarkdown(
  markdown: string
): BriefingSections | null {
  const trimmed = markdown.trim();
  if (!trimmed) return null;

  const lines = trimmed.split(/\r?\n/);
  const firstSectionIdx = lines.findIndex((line) =>
    /^##\s+.+$/.test(line.trim())
  );
  if (firstSectionIdx === -1) return null;

  const intro = lines.slice(0, firstSectionIdx).join("\n").trim();
  const fromFirstHeading = lines.slice(firstSectionIdx).join("\n");
  const rawBlocks = fromFirstHeading.split(/(?=^##\s+)/m);
  const sections: { title: string; body: string }[] = [];

  for (const block of rawBlocks) {
    const b = block.trim();
    if (!b) continue;
    const firstNl = b.indexOf("\n");
    const titleLine = (firstNl === -1 ? b : b.slice(0, firstNl)).trim();
    const titleMatch = /^##\s+(.+)$/.exec(titleLine);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();
    const body = firstNl === -1 ? "" : b.slice(firstNl + 1).trim();
    sections.push({ title, body });
  }

  if (sections.length === 0) return null;
  return { intro, sections };
}
