# Recruiter assistant production-readiness roadmap

**Status:** Current planning artifact for `services/recruiter-assistant-api`.
**Baseline:** v0.15.0, `origin/main` at `ff2533d` on 2026-06-26.

This roadmap replaces the stale production-readiness snapshot that treated
observability, prompt versioning, feedback correlation, reliability, and eval
gating as open work. Those items have since landed. Keep the historical context
visible here so future planning does not reopen already-finished slices, but use
the v0.15.0 state below as the source of truth for the next operational work.

## Current baseline

The recruiter assistant is now past the first production-readiness layer:

- The Lambda API has structured per-request tracing for model stages, retrieval
  stats, token usage, estimated cost, request outcomes, and prompt metadata.
- Chat traces and feedback records can be correlated by backend `requestId`.
- Prompt metadata is explicit in the registry, attached to traces, printed by
  eval runs, and guarded by a prompt-manifest version-bump check in CI.
- Retrieval evals run in CI for trusted PRs and main pushes, with deterministic
  fixture tests for hard-gate and reference behavior.
- Awaited model calls have timeout, retry, backoff, and cancellation helpers.
- CloudWatch EMF metrics are emitted from request traces.
- Intent-gate rejections are traced and saved instead of disappearing before the
  pipeline trace exists.
- Feedback storage behavior is documented in setup and disclosed in public
  terms.

This is enough for traceability and guarded iteration, but not enough for
operational ownership. The next work should focus on cancellation, dashboards,
eval history, feedback triage, and privacy controls rather than rebuilding the
baseline instrumentation.

## Implemented as of v0.15.0

| Area                                       | Status      | Evidence in current tree                                                                                                                                                            |
| ------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feedback-to-trace correlation              | Implemented | The API writes a request trace annotation into the stream, frontend feedback submits the backend `requestId`, and feedback/trace S3 objects share that key.                         |
| Prompt metadata in traces                  | Implemented | `RequestTrace.recordStage()` looks up prompt-backed stages through the prompt registry and records `promptId` plus `promptVersion`.                                                 |
| Prompt versioning integrity                | Implemented | `prompts.manifest.json`, `build:prompt-manifest`, and `check:prompt-version-bump` fail CI when prompt text changes without a registry version/date bump.                            |
| Retrieval eval CI gate                     | Implemented | `.github/workflows/recruiter-api.yml` builds the LlamaIndex corpus, snapshots the eval corpus, runs `eval:retrieval`, and only skips the gate for fork PRs without trusted secrets. |
| Awaited-call reliability                   | Implemented | `runReliableModelCall()` wraps awaited `generateObject`, `generateText`, and embedding calls through `traceGenerate()` and the intent gate.                                         |
| Trace metrics                              | Implemented | `requestTraceMetrics.ts` emits CloudWatch EMF request and stage metrics under `DanielTostes/RecruiterAssistant`.                                                                    |
| Rejected request tracing                   | Implemented | Intent-gate rejections finalize, log, and save traces with error outcomes.                                                                                                          |
| Deterministic hard-gate/reference coverage | Implemented | `tests/evalFixtures.test.ts` runs committed hard-gate and reference fixture cases in the normal Vitest suite.                                                                       |
| Feedback storage disclosure                | Implemented | Setup docs and public terms disclose reviewable feedback storage, request identifiers, hashes, and retained question/response text.                                                 |

## Partially implemented

| Area                  | Current state                                                                                                                                                                   | Remaining risk                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Streaming reliability | Awaited calls are bounded and retryable, and streamed stages are traced via `onFinish`. `streamText` stages are not yet wrapped with equivalent timeout/cancellation semantics. | Hung or slow streams can still consume the request budget awkwardly, and partial stream failures do not have a consistent user-facing and trace policy.    |
| Request cancellation  | The reliability helper accepts an `AbortSignal`, but request/client disconnect cancellation is not yet threaded through the full Lambda stream pipeline.                        | Browser closes, tab navigation, or upstream aborts may leave work running longer than needed.                                                              |
| Operational metrics   | EMF payloads exist for request/stage counts, latency, tokens, costs, retrieval stats, and missing usage/cost markers.                                                           | There is no committed dashboard, alarm policy, or incident runbook that turns those metrics into operational action.                                       |
| Eval maturity         | Retrieval has a CI gate; hard-gate/reference cases are deterministic tests; E2E evals print prompt versions and run assertions against a dev server.                            | CI does not persist scorecards/history by prompt version, corpus hash, model, or commit, so trend and regression review is still manual.                   |
| Feedback loop         | Feedback records include text, hashes, rating, reason/comment, session/message ids, locale, and request id; traces are saved by the same id.                                    | There is no review queue, triage taxonomy, sanitization workflow, or scripted path from feedback to new eval fixtures.                                     |
| Privacy posture       | Terms disclose feedback review storage and setup recommends limited retention patterns.                                                                                         | Retention periods, lifecycle rules, access review, deletion procedure, and data minimization policy are not yet explicit enough for production operations. |

## Stale historical items

The older roadmap was useful as a planning artifact, but several of its open
items are now complete:

| Older roadmap concern                                            | Current v0.15.0 status                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| "Correlate thumbs feedback with backend traces."                 | Landed through feedback `requestId` wiring and trace persistence. Remaining work is review-to-eval workflow, not correlation.  |
| "Attach prompt versions to traces and evals."                    | Landed through the prompt registry, trace stage metadata, and eval prompt-version stamps. Remaining work is scorecard history. |
| "Gate retrieval quality in CI."                                  | Landed through the trusted-PR/main retrieval eval gate. Remaining work is historical reporting and threshold governance.       |
| "Harden awaited AI calls."                                       | Landed for awaited model and embedding calls. Remaining work is streamed stage reliability and request cancellation.           |
| "Emit trace metrics."                                            | Landed as EMF metrics. Remaining work is dashboards, alarms, and runbooks.                                                     |
| "Enforce prompt version bumps."                                  | Landed through prompt manifest integrity checks. Remaining work is operational reporting by prompt version.                    |
| "Trace rejected requests."                                       | Landed for intent-gate rejections. Remaining work is dashboarding rejection rates and triaging false positives.                |
| "Add deterministic fixture tests for hard gates and references." | Landed in the normal service test suite. Remaining work is expanding fixtures from feedback and incidents.                     |
| "Disclose feedback storage."                                     | Landed in setup docs and public terms. Remaining work is retention and access posture.                                         |

## Next slices

### 1. Streaming/request cancellation reliability

Goal: give streamed stages the same operational discipline that awaited calls
now have.

Scope:

- Thread a request-scoped cancellation signal through the Lambda stream response
  and pipeline.
- Define a total request budget plus per-stream-stage budgets for evaluator,
  analyst, briefing, and pitch streams.
- Decide which streamed failures can be retried before user-visible output and
  which must fail closed with a partial-response marker.
- Record cancellation, timeout, and partial-stream outcomes distinctly in traces
  and EMF metrics.
- Add tests for client abort, hung stream, provider timeout, and late `onFinish`
  behavior.

Acceptance signal: an aborted browser/request stops downstream AI work, every
stream timeout produces a trace outcome, and no successful trace hides a partial
or cancelled streamed stage.

### 2. Eval scorecards/history

Goal: make eval quality reviewable across commits, prompt versions, model
versions, and corpus snapshots.

Scope:

- Emit machine-readable JSON summaries from retrieval, hard-gate/reference, and
  E2E eval runners.
- Include commit SHA, prompt version stamps, prompt content hashes, corpus hash,
  model id, fixture version, pass/fail counts, and failure severity.
- Upload CI scorecards as artifacts and keep a small committed or generated
  history policy for release review.
- Define which eval failures block PRs, which create review tasks, and which are
  manual rubric notes.

Acceptance signal: a reviewer can compare "pitch 1.0.1 on corpus X" against the
prior release without scraping CI logs.

### 3. Feedback review-to-eval loop

Goal: turn recruiter feedback into regression coverage without logging or
committing sensitive raw submissions by default.

Scope:

- Document the manual review process for S3 feedback records and matching trace
  objects by `requestId`.
- Add a failure taxonomy that maps feedback reasons and trace symptoms to eval
  fixture candidates.
- Provide a sanitization checklist before any feedback-derived text is committed
  as a fixture.
- Add a lightweight script or runbook step to produce redacted fixture drafts
  from selected feedback/trace pairs.
- Track which feedback records were converted, ignored, or require prompt/corpus
  updates.

Acceptance signal: negative feedback can become a deterministic eval case with a
review trail and without copying private recruiter text into git accidentally.

### 4. CloudWatch dashboard, alarms, and runbook

Goal: make the EMF metrics actionable for an operator.

Scope:

- Commit a dashboard/runbook spec for request volume, error rate, p95/p99
  latency, stage latency, stage errors, token/cost totals, missing usage/cost
  counts, retrieval returned chunks, retrieval similarity ranges, and rejection
  rates.
- Define alarms for sustained request errors, stage-specific failures,
  timeout/cancellation spikes, retrieval degradation, missing usage/cost spikes,
  and cost anomalies.
- Add triage steps that map alarms to CloudWatch Logs Insights queries and S3
  trace/feedback lookup.
- Document dev vs production metric dimensions through
  `RECRUITER_METRICS_ENVIRONMENT`.

Acceptance signal: an operator can answer "is the assistant healthy, expensive,
or silently degrading?" from the dashboard and has a first-response runbook.

### 5. Privacy/retention posture

Goal: make retained feedback and traces match an explicit operating policy.

Scope:

- Define retention windows for CloudWatch logs, feedback S3 records, trace S3
  records, and generated eval artifacts.
- Add S3 lifecycle guidance for feedback/traces and confirm whether versioning,
  Glacier transition, and deletion behavior match the policy.
- Document who can access feedback/trace buckets and how access is reviewed.
- Define a deletion path for a specific request/session id.
- Revisit whether stored question/response text should be redacted, sampled, or
  split by rating before long-term retention.
- Keep public terms aligned with the exact retention and review posture.

Acceptance signal: storage behavior is no longer only "disclosed"; it is
bounded, reviewable, and operationally enforceable.

## Suggested sequence

1. Streaming/request cancellation reliability.
2. CloudWatch dashboard, alarms, and runbook.
3. Eval scorecards/history.
4. Feedback review-to-eval loop.
5. Privacy/retention posture.

This order reduces production risk first, then makes quality and privacy loops
repeatable. The slices can still be split into separate PRs/worktrees because
they touch different surfaces: runtime reliability, ops docs/config, eval
scripts, feedback triage tooling, and policy docs.

## Non-goals for this roadmap

- No runtime changes are made by this document.
- No prompt wording changes are proposed here.
- No service eval thresholds are changed here.
- No AWS resources are created by this document.
