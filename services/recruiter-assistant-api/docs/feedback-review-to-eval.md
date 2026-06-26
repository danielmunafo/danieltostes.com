# Feedback Review To Eval Loop

This workflow turns negative recruiter-assistant feedback into local review items and, when an issue repeats, an eval case. It is offline by design: the script reads JSON files already exported to disk and never calls AWS, OpenAI, or the live API.

## Privacy Defaults

Feedback records can contain the submitted recruiter question and assistant response. `npm run feedback:review` omits `questionText` and `responseText` by default and keeps hashes, reason/comment, locale, request id, and trace metadata. Use `--include-text` only for local review, write outputs under `private/`, and do not commit exported feedback or review reports.

The report keeps enough metadata to debug without raw text:

- feedback: `requestId`, `timestamp`, `locale`, `reason`, `comment`, `questionHash`, `responseHash`
- trace: `outcome`, `errorName`, total latency, retrieval stats, stage status, `promptId`, `promptVersion`
- suggested eval targets based on feedback reason and sparse retrieval signals

## Export S3 Objects Locally

The script does not require AWS credentials. If an operator needs fresh data, export the feedback bucket first:

```bash
cd services/recruiter-assistant-api
mkdir -p private/feedback-export/v2 private/feedback-review
aws s3 sync "s3://$FEEDBACK_S3_BUCKET/${FEEDBACK_S3_PREFIX:-v2}" \
  "private/feedback-export/${FEEDBACK_S3_PREFIX:-v2}" \
  --exclude "*" \
  --include "*.json" \
  --include "traces/*.json"
```

The current S3 layout writes feedback records at the prefix root and traces under `traces/`. Both object types join by `requestId`.

## Build A Review Report

```bash
cd services/recruiter-assistant-api
npm run feedback:review -- \
  --input private/feedback-export/v2 \
  --output private/feedback-review/review-report.json
```

For a smaller promotion-oriented shape:

```bash
npm run feedback:review -- \
  --input private/feedback-export/v2 \
  --format eval-candidates \
  --output private/feedback-review/eval-candidates.json
```

For local-only text review:

```bash
npm run feedback:review -- \
  --input private/feedback-export/v2 \
  --include-text \
  --output private/feedback-review/local-text-review.json
```

## Review Triage

Start from `summary.missingTraceRecords`; missing traces are still reviewable but may indicate export gaps. Then group items by `reason`, `comment`, and hashes:

- Same `questionHash` across multiple negative records usually means one recruiter scenario needs an eval.
- Same `responseHash` across different questions can point to a repeated prompt or formatting issue.
- Stage `error` statuses and `errorName` values point to reliability or parsing failures.
- `promptId`/`promptVersion` shows which prompt version generated the reviewed answer.
- Low or surprising retrieval stats usually mean a retrieval case is better than a prompt change.

## Promote To Evals

Create sanitized, representative cases. Do not paste raw exported recruiter text into committed eval fixtures unless it has been deliberately rewritten as non-sensitive test input.

Choose the narrowest eval target:

- `evals/retrieval/cases.json`: relevant portfolio evidence exists but did not retrieve, top-K was sparse, or an absent skill retrieved as a false positive.
- `evals/hard-gates/cases.json`: a must-have requirement, practical gate, recommendation clamp, or allowed recommendation was wrong.
- `evals/references/cases.json`: a claim was uncited, cited to the wrong source, or a gap should have appeared in the Not Evidenced section.
- `evals/e2e/cases.json` plus `evals/e2e/fixtures/jds/*.txt`: the full answer was wrong, too long, off-topic, or only reproducible through the complete pipeline.

After adding a case, run the matching check from `evals/README.md`. For deterministic fixture promotions, run:

```bash
npm test -- --run tests/evalFixtures.test.ts
```

For retrieval cases, rebuild or refresh the corpus snapshot and run:

```bash
npm run eval:snapshot
npm run eval:retrieval -- --case R-XX
```

For full-pipeline candidates, run the E2E dev server and the specific case:

```bash
RECRUITER_E2E=1 npm run dev:server
npm run eval:e2e -- --case E2E-XX
```
