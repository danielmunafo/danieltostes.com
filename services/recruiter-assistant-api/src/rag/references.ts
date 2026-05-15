import type { createOpenAI } from "@ai-sdk/openai";
import { embedMany, generateObject } from "ai";
import { z } from "zod";
import {
  CHAT_MODEL,
  CLAIM_EXTRACTION_MAX_TOKENS,
  EMBEDDING_MODEL,
  type RecruiterNavLocale,
  type RecruiterReferencesLabels,
  RECRUITER_OFF_TOPIC_BRIEF_HEADING_REGEX,
  RECRUITER_REFERENCES_LABELS,
  REFERENCE_EXCERPT_CHARS,
  REFERENCE_MATCH_THRESHOLD,
  REFERENCE_MAX_CLAIMS,
} from "../constants.js";
import { cosineSimilarity, type EmbeddingChunk } from "./retrieve.js";

type OpenAiClient = ReturnType<typeof createOpenAI>;

interface MatchResult {
  readonly chunk: EmbeddingChunk | null;
  readonly score: number;
}

export interface ReferenceItem extends MatchResult {
  readonly claim: string;
}

const claimsSchema = z.object({
  claims: z
    .array(
      z
        .string()
        .min(4)
        .describe(
          "A short, specific, evidence-style claim the assessment made about the candidate (e.g. 'production fintech engineering at Klarna', 'cross-functional collaboration with product and infrastructure teams'). Avoid generic praise or restated job description text."
        )
    )
    .max(REFERENCE_MAX_CLAIMS),
  gaps: z
    .array(
      z
        .string()
        .min(4)
        .describe(
          "A short label for an important skill, experience, or constraint the assessment identified as missing or not evidenced in the portfolio (e.g. 'Production Golang ownership', 'German fluency')."
        )
    )
    .max(REFERENCE_MAX_CLAIMS)
    .optional(),
});

/** Editorial / thematic chunks excluded from recruiter-facing reference links. */
const REFERENCE_EXCLUDED_SECTION_IDS = new Set<string>(["ragEvidence"]);

function isConcreteEvidenceChunk(chunk: EmbeddingChunk): boolean {
  const sectionId = chunk.metadata?.sectionId?.trim();
  if (!sectionId) return true;
  return !REFERENCE_EXCLUDED_SECTION_IDS.has(sectionId);
}

/**
 * Chunks eligible for the post-response References section (excludes rag-evidence).
 */
export function filterChunksForReferenceMatching(
  chunks: readonly EmbeddingChunk[]
): EmbeddingChunk[] {
  return chunks.filter(isConcreteEvidenceChunk);
}

/**
 * Locales used in `build-embeddings.mjs` chunk ids (`<locale>-<scrollTargetId>-s…`).
 * Longest prefix first so `pt-BR` is not parsed as `pt`.
 */
const EMBEDDINGS_ID_LOCALE_PREFIXES = ["pt-BR", "en", "es", "it"] as const;

/**
 * When chunk metadata omits `locale` / `scrollTargetId` (legacy embeddings),
 * recover them from the stable id format emitted by `build-embeddings.mjs`.
 */
function parseLocaleAndScrollTargetFromEmbeddingChunkId(
  id: string
): { locale: string; scrollTargetId: string } | null {
  const withoutPart = id.replace(/-s\d+-p\d+$/u, "");
  if (withoutPart === id) return null;
  for (const loc of EMBEDDINGS_ID_LOCALE_PREFIXES) {
    const prefix = `${loc}-`;
    if (withoutPart.startsWith(prefix)) {
      const scrollTargetId = withoutPart.slice(prefix.length).trim();
      if (scrollTargetId.length > 0) return { locale: loc, scrollTargetId };
    }
  }
  return null;
}

/**
 * Extracts the most concrete claims from a streamed assistant response, matches
 * each against **concrete** portfolio chunks (experience, impact, summary, etc. —
 * not `ragEvidence` editorial sections) via cosine similarity, and returns a
 * `## References` markdown block. Low scores add a caveat; no concrete chunk
 * yields a manual-review flag.
 *
 * Returns an empty string when the response is off-topic, empty, or claim
 * extraction fails — callers should not surface a References section in that case.
 */
export async function buildReferencesMarkdown(
  openai: OpenAiClient,
  assistantText: string,
  chunks: readonly EmbeddingChunk[],
  navLocale: RecruiterNavLocale
): Promise<string> {
  const trimmed = assistantText.trim();
  if (!trimmed || RECRUITER_OFF_TOPIC_BRIEF_HEADING_REGEX.test(trimmed))
    return "";

  let claims: readonly string[];
  let gaps: readonly string[];
  try {
    const { object } = await generateObject({
      model: openai(CHAT_MODEL),
      schema: claimsSchema,
      maxTokens: CLAIM_EXTRACTION_MAX_TOKENS,
      prompt: buildClaimExtractionPrompt(trimmed),
    });
    claims = object.claims
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .slice(0, REFERENCE_MAX_CLAIMS);
    gaps = (object.gaps ?? [])
      .map((g) => g.trim())
      .filter((g) => g.length > 0)
      .slice(0, REFERENCE_MAX_CLAIMS);
  } catch {
    return "";
  }
  if (claims.length === 0 && gaps.length === 0) return "";

  let embeddings: number[][];
  try {
    const res = await embedMany({
      model: openai.embedding(EMBEDDING_MODEL),
      values: [...claims],
    });
    embeddings = res.embeddings;
  } catch {
    return "";
  }

  const concreteChunks = filterChunksForReferenceMatching(chunks);
  const items: ReferenceItem[] = claims.map((claim, i) => ({
    claim,
    ...findBestMatch(concreteChunks, embeddings[i]),
  }));

  return renderReferencesMarkdown(items, navLocale, gaps);
}

/** Exported for unit tests only. Do not use outside of `buildReferencesMarkdown`. */
export function buildClaimExtractionPromptForTest(
  assistantText: string
): string {
  return buildClaimExtractionPrompt(assistantText);
}

/** Exported for unit tests only — sentence-level excerpt selection. */
export function formatExcerptForTest(text: string, claim?: string): string {
  return formatExcerpt(text, claim);
}

/** Exported for unit tests only. */
export function splitSentencesForTest(text: string): string[] {
  return splitSentences(text);
}

function buildClaimExtractionPrompt(assistantText: string): string {
  return `Extract the most concrete positive evidence-style claims AND important gaps from this assessment.

**claims** — a specific **positive** factual statement about what the candidate demonstrably did, built, owned, or led — something that can be verified by a portfolio source.

Do NOT put these in claims:
- Absence claims, gap statements, or negative assessments (e.g. "Golang ownership is not evidenced", "no evidence of X", "X is missing from the portfolio", "X is not found").
- Risk statements, score explanations, or interview-plan items.
- Generic recruiter praise or restated job-description text.
- Score-only sentences.

Examples of good claims:
- "Production fintech engineering at Klarna"
- "Architectural ownership of distributed workflow orchestration"
- "Cross-functional collaboration with product and infrastructure teams"
- "Observability and SLO practice in high-traffic systems"

**gaps** — short labels for important skills, experiences, or hard constraints the assessment identifies as **missing, not evidenced, or not demonstrated** in the portfolio. These are the decisive gaps that limit the score or constitute practical fit risks.

Examples of good gaps:
- "Production Golang ownership"
- "Go runtime/concurrency optimization"
- "German fluency"
- "Formal Staff-level RFC author/reviewer scope"

Do NOT put in gaps:
- Items that are evidenced (even partially).
- Generic weaknesses not specific to this assessment.

Constraints:
- Return at most ${REFERENCE_MAX_CLAIMS} claims and at most ${REFERENCE_MAX_CLAIMS} gaps.
- One factual unit per entry, short and self-contained.
- Use the language of the assessment.

Assessment:
---
${assistantText}
---`;
}

/** Best-similarity chunk for a single query embedding. Exposed for tests. */
export function findBestMatch(
  chunks: readonly EmbeddingChunk[],
  queryEmbedding: number[]
): MatchResult {
  let bestChunk: EmbeddingChunk | null = null;
  let bestScore = -Infinity;
  for (const chunk of chunks) {
    const score = cosineSimilarity(chunk.embedding, queryEmbedding);
    if (score > bestScore) {
      bestScore = score;
      bestChunk = chunk;
    }
  }
  return { chunk: bestChunk, score: bestChunk ? bestScore : 0 };
}

/**
 * Formats cosine similarity (typically 0-1) as a whole-number percentage for
 * recruiter-facing markdown (e.g. 0.51 → "51%").
 */
function formatSimilarityAsPercent(score: number): string {
  const clamped = Math.min(1, Math.max(0, score));
  return `${Math.round(clamped * 100)}%`;
}

/** Buckets cosine similarity for recruiter-facing support labels (not primary %). */
export type ReferenceSupportLevelKey =
  | "strong"
  | "moderate"
  | "weak"
  | "unsupported";

export function referenceSupportLevelKey(
  score: number
): ReferenceSupportLevelKey {
  if (score >= 0.6) return "strong";
  if (score >= 0.45) return "moderate";
  if (score >= 0.4) return "weak";
  return "unsupported";
}

function supportLevelLabelForLocale(
  L: RecruiterReferencesLabels,
  score: number
): string {
  switch (referenceSupportLevelKey(score)) {
    case "strong":
      return L.supportStrong;
    case "moderate":
      return L.supportModerate;
    case "weak":
      return L.supportWeakManual;
    default:
      return L.supportUnsupportedManual;
  }
}

/** Renders the matched claims as a localized `## …` References markdown block. */
export function renderReferencesMarkdown(
  items: readonly ReferenceItem[],
  navLocale: RecruiterNavLocale = "en",
  gaps: readonly string[] = []
): string {
  const L = RECRUITER_REFERENCES_LABELS[navLocale];
  const lines: string[] = [`## ${L.heading}`, "", L.intro, ""];
  items.forEach((item, idx) => {
    const n = idx + 1;
    lines.push(`${n}. **${item.claim}**`);
    if (!item.chunk) {
      lines.push(`   - ${L.noVectorMatchCaveat}.`);
      lines.push("");
      return;
    }
    lines.push(
      `   - ${L.sourceLabel}: ${formatSourceWithOptionalLink(item.chunk, L.portfolioSourceFallback)} — "${formatExcerpt(item.chunk.text, item.claim)}"`
    );
    const scorePercent = formatSimilarityAsPercent(item.score);
    const thresholdPercent = formatSimilarityAsPercent(
      REFERENCE_MATCH_THRESHOLD
    );
    lines.push(
      `   - ${L.supportLevelLabel}: ${supportLevelLabelForLocale(L, item.score)}`
    );
    lines.push(`   - ${L.similaritySecondaryLabel}: ${scorePercent}`);
    if (item.score < REFERENCE_MATCH_THRESHOLD) {
      lines.push(
        `   - ${L.matchScoreBelowThresholdSuffix.replace("{threshold}", thresholdPercent)}`
      );
    }
    lines.push("");
  });

  if (gaps.length > 0) {
    lines.push(`## ${L.notEvidencedHeading}`, "");
    for (const gap of gaps) {
      lines.push(`- ${gap}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatSourceLabel(
  chunk: EmbeddingChunk,
  portfolioSourceFallback: string
): string {
  const title = chunk.metadata?.title?.trim();
  const category = chunk.metadata?.category?.trim();
  const section = chunk.metadata?.sectionId?.trim();
  const tag = category ?? section;
  if (tag && title) return `[${tag}] ${title}`;
  if (title) return title;
  if (tag) return `[${tag}]`;
  return portfolioSourceFallback;
}

/**
 * Deep link to the static portfolio page section that produced this chunk
 * (same convention as search / embeddings: `/<locale>#<scrollTargetId>`).
 */
function buildChunkSourceHref(chunk: EmbeddingChunk): string | null {
  let locale = chunk.metadata?.locale?.trim();
  let scrollTargetId = chunk.metadata?.scrollTargetId?.trim();
  if (!locale || !scrollTargetId) {
    const parsed = parseLocaleAndScrollTargetFromEmbeddingChunkId(chunk.id);
    if (!parsed) return null;
    locale = parsed.locale;
    scrollTargetId = parsed.scrollTargetId;
  }
  return `/${locale}#${scrollTargetId}`;
}

/** Escapes characters that would break CommonMark inline link text. */
function escapeMarkdownLinkText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function formatSourceWithOptionalLink(
  chunk: EmbeddingChunk,
  portfolioSourceFallback: string
): string {
  const label = formatSourceLabel(chunk, portfolioSourceFallback);
  const href = buildChunkSourceHref(chunk);
  if (!href) return label;

  const category = chunk.metadata?.category?.trim();
  const section = chunk.metadata?.sectionId?.trim();
  const tag = category ?? section;
  const title = chunk.metadata?.title?.trim();

  if (tag) {
    const bracketTag = `[${tag}]`;
    const linkPart = `[${escapeMarkdownLinkText(bracketTag)}](${href})`;
    if (title && label.startsWith(`${bracketTag} `)) {
      const afterTag = label.slice(bracketTag.length).trimStart();
      return `${linkPart} ${afterTag}`;
    }
    if (label === bracketTag) return linkPart;
  }

  return `[${escapeMarkdownLinkText(label)}](${href})`;
}

/**
 * Splits text into rough sentence boundaries (period / exclamation / question
 * mark followed by whitespace or end-of-string). Keeps trailing punctuation
 * with the sentence.
 */
function splitSentences(text: string): string[] {
  const raw = text.match(/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g);
  if (!raw) return [text];
  return raw.map((s) => s.trim()).filter(Boolean);
}

/**
 * Scores a sentence by keyword overlap with the claim. Returns the count of
 * distinct claim keywords (≥3 chars, lowercased) found in the sentence.
 */
function sentenceRelevanceScore(sentence: string, claim: string): number {
  const keywords = claim
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 3);
  if (keywords.length === 0) return 0;
  const lowerSentence = sentence.toLowerCase();
  const matched = new Set(keywords.filter((kw) => lowerSentence.includes(kw)));
  return matched.size;
}

/**
 * Picks the most relevant window inside a chunk for a given claim, then
 * truncates to `REFERENCE_EXCERPT_CHARS`. Falls back to the chunk start when
 * no sentence scores above zero.
 */
function formatExcerpt(text: string, claim?: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= REFERENCE_EXCERPT_CHARS) return collapsed;

  if (claim) {
    const sentences = splitSentences(collapsed);
    if (sentences.length > 1) {
      let bestIdx = 0;
      let bestScore = 0;
      for (let i = 0; i < sentences.length; i++) {
        const score = sentenceRelevanceScore(sentences[i], claim);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestScore > 0) {
        const window = sentences
          .slice(bestIdx, bestIdx + 2)
          .join(" ")
          .trim();
        if (window.length <= REFERENCE_EXCERPT_CHARS) return window;
        return `${window.slice(0, REFERENCE_EXCERPT_CHARS).trimEnd()}…`;
      }
    }
  }

  return `${collapsed.slice(0, REFERENCE_EXCERPT_CHARS).trimEnd()}…`;
}
