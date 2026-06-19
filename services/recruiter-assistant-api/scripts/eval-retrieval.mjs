#!/usr/bin/env node
/**
 * Offline retrieval eval runner. No full LLM pipeline — embeds each query with
 * text-embedding-3-small then runs cosine similarity against the corpus snapshot.
 *
 * Requires:
 *   OPENAI_API_KEY in env
 *   evals/retrieval/fixtures/corpus-snapshot.json  (run eval:snapshot first)
 *
 * Usage:
 *   node scripts/eval-retrieval.mjs
 *   node scripts/eval-retrieval.mjs --case R-04
 *   node scripts/eval-retrieval.mjs --locale pt-BR
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadServiceEnvFiles } from "./load-local-env.mjs";

loadServiceEnvFiles();

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceRoot = join(__dirname, "..");
const repoRoot = join(serviceRoot, "../..");
const snapshotPath = join(
  repoRoot,
  "evals/retrieval/fixtures/corpus-snapshot.json"
);
const casesPath = join(repoRoot, "evals/retrieval/cases.json");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const filterCase = args.includes("--case")
  ? args[args.indexOf("--case") + 1]
  : null;
const filterLocale = args.includes("--locale")
  ? args[args.indexOf("--locale") + 1]
  : "en";

// ---------------------------------------------------------------------------
// Cosine similarity (mirrors src/rag/retrieve.ts)
// ---------------------------------------------------------------------------

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

function retrieveTopKWithScores(chunks, queryEmbedding, topK) {
  return chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(chunk.embedding, queryEmbedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function retrieveMergedTopKWithScores(chunks, queryEmbeddings, topK) {
  if (queryEmbeddings.length === 1) {
    return retrieveTopKWithScores(chunks, queryEmbeddings[0], topK);
  }
  const perQueryK = Math.max(1, Math.ceil(topK / queryEmbeddings.length));
  const byId = new Map();
  for (const queryEmbedding of queryEmbeddings) {
    for (const { chunk, score } of retrieveTopKWithScores(
      chunks,
      queryEmbedding,
      perQueryK
    )) {
      const existing = byId.get(chunk.id);
      if (!existing || score > existing.score) {
        byId.set(chunk.id, { chunk, score });
      }
    }
  }
  return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, topK);
}

// ---------------------------------------------------------------------------
// OpenAI embedding (direct API call)
// ---------------------------------------------------------------------------

async function embedQuery(query) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is required");

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: query,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI embeddings API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

function chunkMatchesPatterns(chunk, patterns) {
  return patterns.some((p) =>
    chunk.text.toLowerCase().includes(p.toLowerCase())
  );
}

function runPositiveAssertion(scored, evalCase) {
  const { top_k, expected_chunk_patterns, min_recall_at_k = 1 } = evalCase;
  const topK = top_k ?? 30;
  const results = scored.slice(0, topK);
  const matchCount = results.filter(({ chunk }) =>
    chunkMatchesPatterns(chunk, expected_chunk_patterns)
  ).length;

  if (matchCount < min_recall_at_k) {
    const topTexts = results
      .slice(0, 5)
      .map(
        (r, i) =>
          `  ${i + 1}. [${r.score.toFixed(3)}] ${r.chunk.text.slice(0, 80).replace(/\n/g, " ")}…`
      );
    return {
      pass: false,
      detail: `recall@${topK} = ${matchCount}/${min_recall_at_k} required.\n  Patterns: ${expected_chunk_patterns.join(", ")}\n  Top-5:\n${topTexts.join("\n")}`,
    };
  }

  const best = results.find(({ chunk }) =>
    chunkMatchesPatterns(chunk, expected_chunk_patterns)
  );
  return {
    pass: true,
    detail: `recall@${topK} OK — best match at rank ${results.indexOf(best) + 1}, score=${best.score.toFixed(3)}`,
  };
}

function runNegativeAssertion(scored, evalCase) {
  const { max_similarity_threshold, top_k } = evalCase;
  const topK = top_k ?? 30;
  const results = scored.slice(0, topK);
  const maxScore = Math.max(...results.map((r) => r.score), 0);

  if (maxScore >= max_similarity_threshold) {
    const offender = results.find((r) => r.score >= max_similarity_threshold);
    return {
      pass: false,
      detail: `Negative test failed: max similarity ${maxScore.toFixed(3)} >= threshold ${max_similarity_threshold}.\n  Offending chunk: "${offender.chunk.text.slice(0, 100).replace(/\n/g, " ")}…"`,
    };
  }

  return {
    pass: true,
    detail: `Negative test OK — max similarity ${maxScore.toFixed(3)} < threshold ${max_similarity_threshold}`,
  };
}

function runSecondaryAssertion(scored, evalCase) {
  if (!evalCase.secondary_top_k || !evalCase.secondary_chunk_patterns)
    return null;
  const results = scored.slice(0, evalCase.secondary_top_k);
  const match = results.find(({ chunk }) =>
    chunkMatchesPatterns(chunk, evalCase.secondary_chunk_patterns)
  );
  if (!match) {
    return {
      pass: false,
      detail: `Secondary recall@${evalCase.secondary_top_k} failed for patterns: ${evalCase.secondary_chunk_patterns.join(", ")}`,
    };
  }
  return {
    pass: true,
    detail: `Secondary recall@${evalCase.secondary_top_k} OK — match at rank ${results.indexOf(match) + 1}`,
  };
}

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

const SEVERITY_COLOR = {
  CRITICAL: "\x1b[31m",
  HIGH: "\x1b[33m",
  MEDIUM: "\x1b[34m",
  LOW: "\x1b[90m",
};
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";

function printResult(evalCase, assertion, secondary = null) {
  const sev = SEVERITY_COLOR[evalCase.severity_if_failed] ?? "";
  const status =
    assertion.pass && (secondary === null || secondary.pass)
      ? `${GREEN}PASS${RESET}`
      : `${RED}FAIL${RESET}`;
  const sevLabel =
    assertion.pass && (secondary === null || secondary.pass)
      ? ""
      : ` ${sev}[${evalCase.severity_if_failed}]${RESET}`;
  console.log(
    `  ${status}${sevLabel} ${evalCase.test_id} — ${evalCase.query.slice(0, 60)}`
  );
  if (!assertion.pass || (secondary !== null && !secondary.pass)) {
    console.log(`         ${assertion.detail}`);
    if (secondary && !secondary.pass)
      console.log(`         ${secondary.detail}`);
  } else {
    console.log(`         ${assertion.detail}`);
    if (secondary) console.log(`         ${secondary.detail}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!existsSync(snapshotPath)) {
    console.error(
      `[eval:retrieval] Corpus snapshot not found at:\n  ${snapshotPath}\n\n` +
        "  Run: npm run eval:snapshot (in services/recruiter-assistant-api)"
    );
    process.exit(1);
  }

  const corpus = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const localeCorpus = corpus.filter(
    (c) => !c.metadata?.locale || c.metadata.locale === filterLocale
  );
  console.log(
    `\n[eval:retrieval] Corpus: ${corpus.length} total chunks, ${localeCorpus.length} for locale="${filterLocale}"\n`
  );

  const { cases } = JSON.parse(readFileSync(casesPath, "utf8"));
  const toRun = filterCase
    ? cases.filter((c) => c.test_id === filterCase)
    : cases;

  if (toRun.length === 0) {
    console.error(`No cases matched filter: ${filterCase}`);
    process.exit(1);
  }

  const results = { pass: 0, fail: 0, critical: 0 };

  for (const evalCase of toRun) {
    process.stdout.write(`  Running ${evalCase.test_id}…`);
    let embedding;
    try {
      embedding = await embedQuery(evalCase.query);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      results.fail++;
      continue;
    }

    const scored = retrieveMergedTopKWithScores(localeCorpus, [embedding], 30);
    const assertion = evalCase.is_negative_test
      ? runNegativeAssertion(scored, evalCase)
      : runPositiveAssertion(scored, evalCase);
    const secondary = runSecondaryAssertion(scored, evalCase);

    process.stdout.write("\r");
    printResult(evalCase, assertion, secondary);

    const passed = assertion.pass && (secondary === null || secondary.pass);
    if (passed) {
      results.pass++;
    } else {
      results.fail++;
      if (evalCase.severity_if_failed === "CRITICAL") results.critical++;
    }
  }

  console.log(
    `\n[eval:retrieval] Results: ${results.pass} passed, ${results.fail} failed` +
      (results.critical > 0
        ? ` (${RED}${results.critical} CRITICAL${RESET})`
        : "") +
      "\n"
  );

  if (results.fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[eval:retrieval] Fatal:", err);
  process.exit(1);
});
