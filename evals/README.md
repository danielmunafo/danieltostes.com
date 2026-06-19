# Eval Framework — recruiter-assistant-api

This directory contains the evaluation dataset for the recruiter-assistant RAG pipeline. Its purpose is to detect quality regressions when prompts, models, or corpus content changes — before those regressions reach production.

## Why this exists

The recruiter assistant runs 6–7 sequential LLM calls per request. A prompt change can silently degrade output quality — wrong recommendation, hallucinated skill, missed hard gate — with no error thrown and no test failing. This eval set makes quality measurable.

## Three evaluation layers

| Layer            | What it tests                                                        | LLM call needed           | When to run           |
| ---------------- | -------------------------------------------------------------------- | ------------------------- | --------------------- |
| **Retrieval**    | Do the right corpus chunks surface in top-30?                        | No — pure cosine math     | Every commit          |
| **Unit (stage)** | Does each stage produce correct output in isolation?                 | Yes — one stage at a time | Before prompt changes |
| **E2E**          | Does the full pipeline produce the right final output for a real JD? | Yes — full pipeline       | Before releases       |

Unit evals tell you _where_ a failure occurred. E2E evals tell you _whether_ the product is working.

## Directory structure

```
evals/
  retrieval/        # R-xx: cosine recall against labeled queries
  grounding/        # G-xx: per-stage LLM output stays within evidence
  hard-gates/       # HG-xx: gate extraction + deterministic clamp rules
  recommendation/   # REC-xx: final recommendation consistent with evidence
  references/       # REF-xx: citations support claims; gaps are surfaced
  e2e/              # E2E-xx: full JD → complete pipeline output
```

## Case schema

Each `cases.json` follows a common base:

```json
{
  "test_id": "R-01",
  "category": "retrieval",
  "query": "...",
  "expected_outcome": "...",
  "evaluation_criteria": "...",
  "severity_if_failed": "CRITICAL | HIGH | MEDIUM | LOW"
}
```

Category-specific fields are documented in each `cases.json`.

## Severity levels

| Severity | Meaning                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------- |
| CRITICAL | Directly misleads a recruiter — wrong recommendation, hallucinated skill, missed language gate |
| HIGH     | Affects trust — wrong evidence level, gate false positive, uncited claim                       |
| MEDIUM   | Quality degradation — wrong excerpt, gap not surfaced, citation weaker than expected           |
| LOW      | Cosmetic — support label phrasing, link format, minor ranking order                            |

## Running the evals

All commands run from `services/recruiter-assistant-api/`.

### Step 1 — Generate the corpus snapshot (once per corpus change)

```bash
npm run eval:snapshot
# → saves evals/retrieval/fixtures/corpus-snapshot.json
```

Requires a local LlamaIndex index at `LLAMAINDEX_INDEX_JSON_PATH` or in `embeddings/llamaindex.v*.json`. Run `npm run build:llamaindex-index` first if needed.

### Step 2 — Retrieval evals (offline, no LLM)

```bash
npm run eval:retrieval
# Run a single case:
npm run eval:retrieval -- --case R-04
# Run against a specific locale:
npm run eval:retrieval -- --locale pt-BR
```

Requires `OPENAI_API_KEY` to embed the queries. Everything else is pure math against the snapshot — no LLM call.

### Step 3 — E2E evals (full pipeline)

```bash
# Terminal 1: start the dev server in E2E mode (skips reCAPTCHA)
RECRUITER_E2E=1 npm run dev:server

# Terminal 2: run the eval suite
npm run eval:e2e
# Run a single case:
npm run eval:e2e -- --case E2E-04
```

The e2e runner checks deterministic assertions (recommendation label, technical fit score, references/gaps presence) and prints rubric assertions for manual review. Override the server URL with `EVAL_SERVER_URL=http://...`.

### When to run each layer

| When                                   | Run                                                  |
| -------------------------------------- | ---------------------------------------------------- |
| Every commit                           | `eval:retrieval` (no LLM cost, fast)                 |
| Before any prompt change ships         | `eval:retrieval` + `eval:e2e` on the priority-12 set |
| Before a release                       | Full `eval:e2e` suite                                |
| After corpus/portfolio content changes | `eval:snapshot` then `eval:retrieval`                |

---

## Priority-12 regression set

If you can only run a subset, run these 12 cases — they cover the highest-confidence regression risk across all failure modes:

`R-04`, `HG-02`, `HG-01`, `G-03`, `G-08`, `REC-02`, `REC-03`, `HG-06`, `REF-03`, `R-02`, `G-02`, `HG-05`

Plus for E2E: `E2E-02`, `E2E-03`, `E2E-04`.

## Acceptance thresholds

| Metric                                           | Acceptable      | Degraded    |
| ------------------------------------------------ | --------------- | ----------- |
| Retrieval recall@30 for labeled queries          | ≥ 90%           | < 80%       |
| Hard-gate extraction accuracy                    | ≥ 95%           | < 90%       |
| Grounding (claims with chunk support ≥ 0.4)      | ≥ 80% of claims | < 70%       |
| Recommendation consistency with evidence         | ≥ 90%           | < 85%       |
| Reference support ≥ moderate for top 3 citations | ≥ 85%           | < 75%       |
| E2E deterministic assertions                     | 100%            | any failure |
