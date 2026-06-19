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
