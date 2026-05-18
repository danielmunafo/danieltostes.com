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

/** `# …` title per locale (must match API `RECRUITER_EXECUTIVE_BRIEF_HEADINGS.bestPositioning`). */
export const RECRUITER_BEST_POSITIONING_HEADING: Record<string, string> = {
  en: "Best Positioning Angle",
  "pt-BR": "Melhor ângulo de posicionamento",
  es: "Mejor ángulo de posicionamiento",
  it: "Miglior angolo di posizionamento",
};

export type PitchAndReferencesSplit = {
  readonly pitchMarkdown: string;
  readonly referencesMarkdown: string | null;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findReferencesHeadingIndex(markdown: string, refLine: string): number {
  const headingText = refLine.replace(/^##\s+/, "").trim();
  if (!headingText) return -1;
  const pattern = new RegExp(`^##\\s+${escapeRegExp(headingText)}\\s*$`, "m");
  const match = pattern.exec(markdown);
  return match?.index ?? -1;
}

function findH1HeadingIndex(markdown: string, title: string): number {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return -1;
  const pattern = new RegExp(`^#\\s+${escapeRegExp(trimmedTitle)}\\s*$`, "m");
  const match = pattern.exec(markdown);
  return match?.index ?? -1;
}

/**
 * True once the streamed pitch includes the localized `# Best Positioning Angle` line.
 */
export function hasBestPositioningAngleSectionStarted(
  markdown: string,
  locale: string
): boolean {
  const title =
    RECRUITER_BEST_POSITIONING_HEADING[locale] ??
    RECRUITER_BEST_POSITIONING_HEADING.en;
  return findH1HeadingIndex(markdown, title) !== -1;
}

/**
 * Separates the streamed pitch from the post-stream `## References` block when present.
 */
export function splitPitchAndReferencesMarkdown(
  markdown: string,
  locale: string
): PitchAndReferencesSplit {
  const trimmed = markdown.trim();
  const refLine = RECRUITER_REFERENCE_SECTION_LINE[locale] ?? "## References";
  const idx = findReferencesHeadingIndex(trimmed, refLine);
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
