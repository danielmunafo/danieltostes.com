#!/usr/bin/env node
/**
 * Reference eval runner. Deterministic gap/legacy cases run offline. Claim
 * matching cases embed the committed claim text, match against the corpus
 * snapshot, render deterministic References markdown, then assert the committed
 * thresholds.
 *
 * Requires for vector-matching cases:
 *   OPENAI_API_KEY in env
 *   evals/retrieval/fixtures/corpus-snapshot.json (run eval:snapshot first)
 *
 * Usage:
 *   node scripts/eval-references.mjs
 *   node scripts/eval-references.mjs --case REF-08
 *   node scripts/eval-references.mjs --locale pt-BR
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createTotals,
  filterCases,
  getCliOption,
  printCaseScore,
  printNoCasesAndExit,
  printTotals,
  readJsonFile,
  recordCaseResult,
  textContainsAll,
  textContainsAny,
} from "./lib/eval-runner-utils.mjs";
import { loadServiceEnvFiles } from "./load-local-env.mjs";

loadServiceEnvFiles();

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceRoot = join(__dirname, "..");
const repoRoot = join(serviceRoot, "../..");
const casesPath = join(repoRoot, "evals/references/cases.json");
const defaultSnapshotPath = join(
  repoRoot,
  "evals/retrieval/fixtures/corpus-snapshot.json"
);

const args = process.argv.slice(2);
const filterCase = getCliOption(args, "--case");
const filterLocale = getCliOption(args, "--locale", "en");
const snapshotPath = getCliOption(args, "--snapshot", defaultSnapshotPath);
const referenceLegacyExcludedSectionIds = new Set(["ragEvidence"]);
const referenceMatchThreshold = 0.4;

function caseNeedsVectorMatching(evalCase) {
  if (evalCase.is_deterministic) return false;
  return (
    evalCase.min_similarity !== undefined ||
    evalCase.max_similarity !== undefined ||
    evalCase.expected_support_level !== undefined ||
    evalCase.expected_support_level_any !== undefined ||
    evalCase.expected_chunk_text_contains !== undefined ||
    evalCase.expected_chunk_text_contains_all !== undefined ||
    evalCase.expected_chunk_text_contains_any !== undefined ||
    evalCase.expect_source_link === true
  );
}

async function embedClaim(claim) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for reference vector cases");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: claim,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI embeddings API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

function filterLocaleCorpus(corpus, locale) {
  return corpus.filter(
    (chunk) => !chunk.metadata?.locale || chunk.metadata.locale === locale
  );
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function filterChunksForReferenceMatching(chunks) {
  return chunks.filter((chunk) => {
    const sectionId = chunk.metadata?.sectionId?.trim();
    return !sectionId || !referenceLegacyExcludedSectionIds.has(sectionId);
  });
}

function findBestMatch(chunks, queryEmbedding) {
  let bestChunk = null;
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

function referenceSupportLevelKey(score) {
  if (score >= 0.6) return "strong";
  if (score >= 0.45) return "moderate";
  if (score >= 0.4) return "weak";
  return "unsupported";
}

function supportLevelLabel(score) {
  switch (referenceSupportLevelKey(score)) {
    case "strong":
      return "Strong";
    case "moderate":
      return "Moderate";
    case "weak":
      return "Weak — manual review";
    default:
      return "Unsupported — manual review";
  }
}

function formatSimilarityAsPercent(score) {
  const clamped = Math.min(1, Math.max(0, score));
  return `${Math.round(clamped * 100)}%`;
}

function parseLocaleAndScrollTargetFromEmbeddingChunkId(id) {
  const withoutPart = id.replace(/-s\d+-p\d+$/u, "");
  if (withoutPart === id) return null;
  for (const locale of ["pt-BR", "en", "es", "it"]) {
    const prefix = `${locale}-`;
    if (withoutPart.startsWith(prefix)) {
      const scrollTargetId = withoutPart.slice(prefix.length).trim();
      if (scrollTargetId) return { locale, scrollTargetId };
    }
  }
  return null;
}

function buildChunkSourceHref(chunk) {
  let locale = chunk.metadata?.locale?.trim();
  let scrollTargetId = chunk.metadata?.scrollTargetId?.trim();
  const sectionId = chunk.metadata?.sectionId?.trim();
  if (!locale || !scrollTargetId) {
    const parsed = parseLocaleAndScrollTargetFromEmbeddingChunkId(chunk.id);
    if (!parsed) return null;
    locale = parsed.locale;
    scrollTargetId = parsed.scrollTargetId;
  }
  if (sectionId === "professionalContext") {
    return `/${locale}/recruiter-assistant/professional-context#${scrollTargetId}`;
  }
  return `/${locale}#${scrollTargetId}`;
}

function formatSourceLabel(chunk) {
  const title = chunk.metadata?.title?.trim();
  const category = chunk.metadata?.category?.trim();
  const section = chunk.metadata?.sectionId?.trim();
  const tag = category ?? section;
  if (tag && title) return `[${tag}] ${title}`;
  if (title) return title;
  if (tag) return `[${tag}]`;
  return "Portfolio source";
}

function formatSourceWithOptionalLink(chunk) {
  const label = formatSourceLabel(chunk);
  const href = buildChunkSourceHref(chunk);
  if (!href) return label;

  const category = chunk.metadata?.category?.trim();
  const section = chunk.metadata?.sectionId?.trim();
  const tag = category ?? section;
  const title = chunk.metadata?.title?.trim();
  if (tag) {
    const bracketTag = `[${tag}]`;
    const linkPart = `[\\[${tag}\\]](${href})`;
    if (title && label.startsWith(`${bracketTag} `)) {
      const afterTag = label.slice(bracketTag.length).trimStart();
      return `${linkPart} ${afterTag}`;
    }
    if (label === bracketTag) return linkPart;
  }
  return `[${label}](${href})`;
}

function formatExcerpt(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}

function renderReferencesMarkdown(items, gaps = []) {
  const lines = [
    "## References",
    "",
    "Closest portfolio excerpts by vector similarity, one per claim. Support level summarizes match quality; manually verify critical claims:",
    "",
  ];

  items.forEach((item, index) => {
    lines.push(`${index + 1}. **${item.claim}**`);
    if (!item.chunk) {
      lines.push("   - Lacking vector matching evidence.");
      lines.push("");
      return;
    }
    lines.push(
      `   - Source: ${formatSourceWithOptionalLink(item.chunk)} — "${formatExcerpt(item.chunk.text)}"`
    );
    lines.push(`   - Support level: ${supportLevelLabel(item.score)}`);
    lines.push(
      `   - Similarity (secondary): ${formatSimilarityAsPercent(item.score)}`
    );
    if (item.score < referenceMatchThreshold) {
      lines.push(
        `   - Match score is below confidence threshold (${formatSimilarityAsPercent(referenceMatchThreshold)}), please double check.`
      );
    }
    lines.push("");
  });

  if (gaps.length > 0) {
    lines.push("## Not Evidenced in Retrieved Portfolio Excerpts", "");
    lines.push(
      "These items were not found in the retrieved portfolio evidence and may be worth validating early:",
      ""
    );
    for (const gap of gaps) {
      lines.push(`- ${gap}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function markdownHasBelowThresholdCaveat(markdown) {
  return /below confidence threshold/i.test(markdown);
}

function markdownHasSourceLink(markdown, locale) {
  const escapedLocale = locale.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(String.raw`\]\(/${escapedLocale}(?:#|/)`).test(markdown);
}

function assertMatchedReference(evalCase, match, supportLevel, markdown) {
  const failures = [];
  const chunkText = match.chunk?.text ?? "";

  if (evalCase.expected_chunk_text_contains) {
    const expected = evalCase.expected_chunk_text_contains;
    if (!textContainsAll(chunkText, expected)) {
      failures.push(`matched chunk missing all required terms [${expected}]`);
    }
  }

  if (evalCase.expected_chunk_text_contains_all) {
    const expected = evalCase.expected_chunk_text_contains_all;
    if (!textContainsAll(chunkText, expected)) {
      failures.push(`matched chunk missing all required terms [${expected}]`);
    }
  }

  if (evalCase.expected_chunk_text_contains_any) {
    const expected = evalCase.expected_chunk_text_contains_any;
    if (!textContainsAny(chunkText, expected)) {
      failures.push(`matched chunk missing any of [${expected}]`);
    }
  }

  if (
    evalCase.min_similarity !== undefined &&
    match.score < evalCase.min_similarity
  ) {
    failures.push(
      `similarity ${match.score.toFixed(3)} < ${evalCase.min_similarity}`
    );
  }

  if (
    evalCase.max_similarity !== undefined &&
    match.score >= evalCase.max_similarity
  ) {
    failures.push(
      `similarity ${match.score.toFixed(3)} >= ${evalCase.max_similarity}`
    );
  }

  if (
    evalCase.expected_support_level &&
    supportLevel !== evalCase.expected_support_level
  ) {
    failures.push(
      `support level ${supportLevel} !== ${evalCase.expected_support_level}`
    );
  }

  if (
    evalCase.expected_support_level_any &&
    !evalCase.expected_support_level_any.includes(supportLevel)
  ) {
    failures.push(
      `support level ${supportLevel} not in [${evalCase.expected_support_level_any}]`
    );
  }

  if (evalCase.expect_below_threshold_caveat !== undefined) {
    const hasCaveat = markdownHasBelowThresholdCaveat(markdown);
    if (hasCaveat !== evalCase.expect_below_threshold_caveat) {
      failures.push(
        `below-threshold caveat ${hasCaveat} !== ${evalCase.expect_below_threshold_caveat}`
      );
    }
  }

  if (evalCase.expect_source_link === true) {
    if (!markdownHasSourceLink(markdown, filterLocale)) {
      failures.push(`source link for locale "${filterLocale}" missing`);
    }
  }

  return failures;
}

function assertGapCase(evalCase, markdown) {
  const failures = [];
  if (evalCase.should_appear_in_gaps === true) {
    if (!/^##\s+Not Evidenced/im.test(markdown)) {
      failures.push("Not Evidenced section missing");
    }
    if (!textContainsAny(markdown, evalCase.gap_terms ?? [])) {
      failures.push(`gap terms missing [${evalCase.gap_terms ?? []}]`);
    }
  }
  if (evalCase.must_not_appear_as_citation === true) {
    if (/^\s*-\s+Source:/im.test(markdown)) {
      failures.push("gap-only case rendered a positive citation source");
    }
  }
  return failures;
}

function runLegacyExclusionCase(evalCase) {
  const forbidden = new Set(evalCase.forbidden_section_ids ?? []);
  const legacyChunk = {
    id: "legacy-rag-evidence",
    text: "Synthetic legacy chunk with perfect claim overlap.",
    embedding: [1, 0, 0],
    metadata: {
      locale: "en",
      sectionId: "ragEvidence",
      title: "Legacy RAG evidence",
      scrollTargetId: "section-rag-evidence-en",
    },
  };
  const eligibleChunk = {
    id: "eligible-professional-context",
    text: "Synthetic eligible professional context chunk.",
    embedding: [0.95, 0.05, 0],
    metadata: {
      locale: "en",
      sectionId: "professionalContext",
      title: "Professional Context",
      category: "technical-leadership",
      scrollTargetId: "section-professional-context-item-0",
    },
  };

  const concrete = filterChunksForReferenceMatching([
    legacyChunk,
    eligibleChunk,
  ]);
  const match = findBestMatch(concrete, [1, 0, 0]);
  const sectionId = match.chunk?.metadata?.sectionId ?? null;
  const failures = [];

  if (!match.chunk) {
    failures.push("no eligible chunk matched synthetic corpus");
  } else if (forbidden.has(sectionId)) {
    failures.push(`forbidden sectionId was cited: ${sectionId}`);
  }

  return {
    failures,
    summary: `matched=${match.chunk?.id ?? "(none)"}; sectionId=${sectionId ?? "(none)"}`,
  };
}

async function runVectorCase(evalCase, corpus) {
  if (!evalCase.claim) {
    throw new Error("case is missing claim text");
  }

  const queryEmbedding = await embedClaim(evalCase.claim);
  const localeCorpus = filterLocaleCorpus(corpus, filterLocale);
  const concrete = filterChunksForReferenceMatching(localeCorpus);
  const match = findBestMatch(concrete, queryEmbedding);
  const supportLevel = referenceSupportLevelKey(match.score);
  const markdown = renderReferencesMarkdown(
    [{ claim: evalCase.claim, chunk: match.chunk, score: match.score }],
    []
  );
  const failures = assertMatchedReference(
    evalCase,
    match,
    supportLevel,
    markdown
  );

  return {
    failures,
    summary:
      `score=${match.score.toFixed(3)}; support=${supportLevel}; ` +
      `chunk=${match.chunk?.id ?? "(none)"}`,
  };
}

function runGapOnlyCase(evalCase) {
  const markdown = renderReferencesMarkdown([], evalCase.gap_terms ?? []);
  return {
    failures: assertGapCase(evalCase, markdown),
    summary: `gaps=[${(evalCase.gap_terms ?? []).join(", ")}]`,
  };
}

async function main() {
  const { cases } = readJsonFile(casesPath);
  const toRun = filterCases(cases, filterCase);
  if (toRun.length === 0) printNoCasesAndExit(filterCase);

  const needsSnapshot = toRun.some(caseNeedsVectorMatching);
  let corpus = null;
  let snapshotError = null;
  if (needsSnapshot) {
    if (!existsSync(snapshotPath)) {
      snapshotError =
        `Corpus snapshot not found at ${snapshotPath}. ` +
        "Run: npm run eval:snapshot (in services/recruiter-assistant-api).";
    } else {
      corpus = readJsonFile(snapshotPath);
    }
  }

  console.log(
    `\n[eval:references] Running ${toRun.length} case(s) — locale="${filterLocale}"\n`
  );

  const totals = createTotals();
  for (const evalCase of toRun) {
    try {
      let result;
      if (evalCase.is_deterministic) {
        result = runLegacyExclusionCase(evalCase);
      } else if (
        evalCase.should_appear_in_gaps &&
        !caseNeedsVectorMatching(evalCase)
      ) {
        result = runGapOnlyCase(evalCase);
      } else {
        if (snapshotError) throw new Error(snapshotError);
        result = await runVectorCase(evalCase, corpus);
      }

      printCaseScore({
        evalCase,
        failures: result.failures,
        summary: result.summary,
      });
      recordCaseResult(
        totals,
        evalCase,
        result.failures.length === 0 ? "pass" : "fail"
      );
    } catch (err) {
      printCaseScore({
        evalCase,
        failures: [],
        error: err.message,
      });
      recordCaseResult(totals, evalCase, "error");
    }
  }

  printTotals("eval:references", totals);
}

main().catch((err) => {
  console.error("[eval:references] Fatal:", err);
  process.exit(1);
});
