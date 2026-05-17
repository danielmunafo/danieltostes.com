import { smoothStream } from "ai";
import { RECRUITER_EVIDENCE_BRIEF_LABELS } from "./recruiterTranslationConstants.js";

/** Site locales accepted on the recruiter assistant (must match `src/i18n/request.ts`). */
export const RECRUITER_NAV_LOCALES = ["en", "pt-BR", "es", "it"] as const;
export type RecruiterNavLocale = (typeof RECRUITER_NAV_LOCALES)[number];

export function parseRecruiterNavLocale(value: unknown): RecruiterNavLocale {
  if (typeof value !== "string") return "en";
  const trimmed = value.trim();
  return (RECRUITER_NAV_LOCALES as readonly string[]).includes(trimmed)
    ? (trimmed as RecruiterNavLocale)
    : "en";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Matches a localized `# …` off-topic heading from stage-1 briefs (used when
 * guarding the References block on assistant text).
 */
export const RECRUITER_OFF_TOPIC_BRIEF_HEADING_REGEX = new RegExp(
  `^#\\s*(?:${RECRUITER_NAV_LOCALES.map((loc) =>
    escapeRegExp(
      RECRUITER_EVIDENCE_BRIEF_LABELS[loc].headingOffTopicInput.trim()
    )
  ).join("|")})`,
  "m"
);

/** True when stage-1 markdown is the localized off-topic brief (evaluator or analyst). */
export function isRecruiterOffTopicBriefMarkdown(markdown: string): boolean {
  const trimmed = markdown.trim();
  if (!trimmed) return false;
  return RECRUITER_OFF_TOPIC_BRIEF_HEADING_REGEX.test(trimmed);
}

/**
 * When the interests evaluator has nothing assessable, it must emit this line
 * alone (handler omits interests from the client response; optional server log only).
 */
export const INTERESTS_OUTPUT_SKIP_SENTINEL = "[[INTERESTS_SKIP]]";

/** Max tokens for the optional interests alignment `generateText` stage. */
export const INTERESTS_ALIGNMENT_MAX_TOKENS = 768;

/**
 * Recruiter-facing localized labels (prompts, references, UI hints), keyed by
 * `RecruiterNavLocale`. Defined in `./recruiterTranslationConstants.js` and
 * re-exported here so existing imports from this module stay stable.
 */
export {
  RECRUITER_CHUNK_SOURCE_LABEL,
  RECRUITER_EVIDENCE_BRIEF_LABELS,
  RECRUITER_EVIDENCE_CONFIDENCE_TOKENS,
  RECRUITER_EVIDENCE_EVALUATOR_LABELS,
  RECRUITER_EXECUTIVE_BRIEF_HEADINGS,
  RECRUITER_INTERESTS_ALIGNMENT_LABELS,
  RECRUITER_NAV_LOCALE_WRITING_LABEL,
  RECRUITER_RECOMMENDATION_LABELS,
  RECRUITER_REFERENCES_LABELS,
  RECRUITER_RISK_SEVERITY_LABELS,
} from "./recruiterTranslationConstants.js";

export type {
  RecruiterEvidenceBriefLabels,
  RecruiterEvidenceConfidenceTokens,
  RecruiterEvidenceEvaluatorLabels,
  RecruiterExecutiveBriefHeadings,
  RecruiterInterestsAlignmentLabels,
  RecruiterRecommendationLabels,
  RecruiterReferencesLabels,
  RecruiterRiskSeverityLabels,
} from "./recruiterTranslationConstants.js";

/**
 * Max characters accepted for the latest user turn (job description paste).
 * ~4.5k for long postings; cap leaves room for formatting / unicode.
 */
export const MAX_USER_MESSAGE_CHARS = 8192;

/** Max chat turns accepted in one request (abuse guard). */
export const MAX_CHAT_MESSAGES = 50;

/**
 * Max serialized size of the `messages` array in the request body (chars).
 * v1 sends a single user turn per request; cap is an abuse guard.
 */
export const MAX_CHAT_HISTORY_JSON_CHARS = 32_768;

/**
 * OpenAI chat model for recruiter matching. Set `RECRUITER_CHAT_MODEL` on the
 * Lambda in AWS (per function) or in local `.env`; CI does not manage it.
 */
export const CHAT_MODEL =
  process.env.RECRUITER_CHAT_MODEL?.trim() || "gpt-4.1-nano";

/**
 * Re-chunks each provider `text-delta` into words (per AI SDK `smoothStream`)
 * so the wire updates more often than token-batched deltas, without the
 * per-character render rate that can destabilize MUI `Collapse` in the client.
 * `delayInMs` is `null` (no artificial typing delay).
 */
export const recruiterStreamTextSmoothTransform = smoothStream({
  delayInMs: null,
  chunking: "word",
});

/** OpenAI embedding model for RAG. */
export const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * How many portfolio chunks to retrieve for the job-description embedding pass.
 * Higher K gives the LLM more context to interpret holistically; vector matches
 * are still used for the post-response References section to cite evidence.
 */
export const RAG_TOP_K = 30;

/** Max claims extracted from the assistant response for the References section. */
export const REFERENCE_MAX_CLAIMS = 8;

/**
 * Cosine-similarity threshold below which a claim is flagged as lacking vector
 * matching evidence in the References section.
 */
export const REFERENCE_MATCH_THRESHOLD = 0.4;

/** Max characters quoted from a portfolio chunk in the References section. */
export const REFERENCE_EXCERPT_CHARS = 220;

/** Embedding `metadata.sectionId` for professional-context thematic evidence. */
export const PROFESSIONAL_CONTEXT_SECTION_ID = "professionalContext" as const;

/** URL path segment (no leading slash) for professional-context deep links. */
export const RECRUITER_PROFESSIONAL_CONTEXT_ROUTE =
  "recruiter-assistant/professional-context" as const;

/**
 * When a retrieved chunk is within this cosine delta of the global best match,
 * References prefer the retrieved chunk (keeps citations aligned with RAG context).
 */
export const REFERENCE_RETRIEVAL_PREFERENCE_SCORE_DELTA = 0.03;

/** Max tokens for the claim-extraction structured call (post-stream). */
export const CLAIM_EXTRACTION_MAX_TOKENS = 512;

/** Max tokens for pre-RAG intent check (single-line RECRUITER vs OFF_TOPIC). */
/** Intent-gate token cap (`maxTokens` on `ai@^4.3`). */
export const INTENT_GATE_MAX_TOKENS = 24;

/** Max tokens for structured hard-gate row extraction (`generateObject`). */
export const HARD_GATE_EXTRACTION_MAX_TOKENS = 768;

/** Max tokens for the evidence evaluator (`streamText` before the analyst). */
export const EVIDENCE_EVALUATOR_MAX_TOKENS = 1600;

/** Max tokens for the evidence analyst brief (`streamText`, synthesis after evaluator). */
export const EVIDENCE_BRIEF_MAX_TOKENS = 1024;

/** Max tokens for stage-2 streamed executive brief (concise recruiter-facing markdown). */
export const RECRUITER_PITCH_MAX_TOKENS = 1800;

/** In-memory rate limit: max requests per window per client IP. */
export const RATE_LIMIT_MAX_REQUESTS = 20;

/** In-memory rate limit window in milliseconds (10 minutes). */
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/** Max LRU entries for rate-limit map (prevents unbounded growth). */
export const RATE_LIMIT_MAX_ENTRIES = 500;

/**
 * Sentinel markers wrapping the evidence brief in the streamed response, so the
 * client can render the brief as collapsible "thinking" content separately from
 * the main recruiter assessment body. Kept as plain ASCII so they survive any
 * intermediate markdown processing; the front-end splitter strips them before
 * passing markdown to the renderer.
 */
export const THINKING_OPEN_MARKER = "[[THINKING_START]]";
export const THINKING_CLOSE_MARKER = "[[THINKING_END]]";

/**
 * Wraps compact chart JSON between thinking close and pitch stream so the client
 * can render the match profile without exposing raw markers in markdown.
 */
export const CHART_DATA_OPEN_MARKER = "[[CHART_DATA_START]]";
export const CHART_DATA_CLOSE_MARKER = "[[CHART_DATA_END]]";

/**
 * Ephemeral one-line status streamed after evidence review closes and before
 * chart JSON / pitch. Stripped on the client; not shown in final briefing body.
 */
export const BRIEFING_PREP_OPEN_MARKER = "[[BRIEFING_PREP_START]]";
export const BRIEFING_PREP_CLOSE_MARKER = "[[BRIEFING_PREP_END]]";

/** Max tokens for streamed pre-briefing thinking (`streamText`, parallel to chart). */
export const BRIEFING_PREP_STATUS_MAX_TOKENS = 220;

/** Max tokens for post-analyst chart projection (`generateObject`). */
export const DIMENSION_SCORING_MAX_TOKENS = 1536;

/** Tighter cap for chart projection retry after truncation (`finishReason: length`). */
export const DIMENSION_SCORING_COMPACT_MAX_TOKENS = 1024;

/** Stable S3 object key CI overwrites; Lambda `EMBEDDINGS_S3_URI` should point here. */
export const EMBEDDINGS_S3_PUBLISH_KEY = "embeddings.json";

/** Stable S3 object key for LlamaIndex native vector store JSON. */
export const LLAMAINDEX_INDEX_S3_PUBLISH_KEY = "llamaindex-index.json";

/** Stable S3 object key for optional interests pack; Lambda `INTERESTS_PACK_S3_URI` should point here. */
export const INTERESTS_PACK_S3_PUBLISH_KEY = "interests-pack.json";
