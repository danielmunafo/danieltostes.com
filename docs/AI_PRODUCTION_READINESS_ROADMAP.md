# AI Production Readiness Roadmap — recruiter-assistant-api

## 1. Executive Summary

**Overall maturity score: 6.2 / 10.**

**[Observed]** This repository is substantially above a normal personal AI demo: it has a multi-stage RAG pipeline, Lambda streaming, real OpenAI embeddings, a committed eval dataset, request tracing with token/cost estimates, S3-backed trace/feedback persistence, and layered security controls.

**[Observed]** It is still below the bar for a demonstrably operated production AI system because the quality loop is not CI-gated, observability is mostly logs/S3 objects rather than metrics/dashboards/alarms, feedback is not actually correlated to backend traces, model calls lack explicit timeouts/retries, and prompt versions are not attached to traces or eval results.

**General software engineering maturity:** roughly 7.5 / 10. The repo has TypeScript, Vitest, Playwright smoke tests, GitHub Actions, AWS OIDC deploys, strict docs, separated service code, S3 versioned RAG artifacts, CORS/reCAPTCHA/rate limiting, and good local scripts.

**AI-production maturity:** roughly 5.7 / 10. The project now has the important raw materials: traces, costs, retrieval evals, E2E eval cases, feedback UI, S3 persistence, and explicit prompt metadata. The gap is proving and operating those signals continuously.

**What is already strong:**

- **[Observed]** The request path is decomposed into explicit AI stages in `services/recruiter-assistant-api/src/recruiterAssistant/pipeline/runRecruiterAssistantPipeline.ts`: context retrieval, evidence evaluation, hard-gate extraction, optional interests evaluation, evidence analysis, chart projection, pitch generation, chart sync, and references.
- **[Observed]** The trace envelope in `services/recruiter-assistant-api/src/tracing/requestTrace.ts` records per-stage status, latency, token usage, estimated cost, retrieval stats, and request totals.
- **[Observed]** Feedback exists: `src/features/recruiter-assistant/components/AssistantFeedback.tsx`, `src/features/recruiter-assistant/lib/recruiter-assistant-feedback.ts`, `services/recruiter-assistant-api/src/handleFeedbackRequest.ts`, and `services/recruiter-assistant-api/src/feedback/writeFeedbackToS3.ts`.
- **[Observed]** Eval assets exist under `evals/`, with retrieval and E2E runners exposed by `services/recruiter-assistant-api/package.json`.
- **[Observed]** Prompt metadata now exists in `services/recruiter-assistant-api/src/recruiterAssistant/prompt/promptRegistry.ts`, with docs and tests covering nine registered prompt stages.
- **[Observed]** Security controls are layered: input schema validation, length caps, CORS allowlist, in-memory rate limiting, optional reCAPTCHA, prompt-injection heuristics, an LLM intent gate, Secrets Manager, and write-only feedback bucket guidance.

**What is missing:**

- **[Observed]** Evals are not run in `.github/workflows/recruiter-api.yml`; that workflow runs only `npm test` and `npm run build`.
- **[Observed]** No `putMetricData`, CloudWatch EMF, OpenTelemetry, Langfuse, LangSmith, dashboards, or alarms are present.
- **[Observed]** There is no reliability wrapper, retry policy, backoff policy, or per-stage timeout for production LLM/embedding calls.
- **[Observed]** The frontend sends `requestId: messageId` for feedback, while backend traces use `randomUUID()`. The request trace id is not exposed to the frontend, so feedback and trace objects cannot be reliably joined by `requestId`.
- **[Observed]** Prompt versions exist as metadata, but are not attached to runtime traces, eval scorecards, or a generated manifest. There is no content hash or CI version-bump guard.

**Highest-leverage next moves:**

1. Fix feedback-to-trace correlation by exposing the backend trace `requestId` to the client and storing that id in feedback.
2. Add a reliability wrapper around model/embedding calls: timeout budgets, retry classification, jittered backoff, and cancellation.
3. Gate quality with CI evals: retrieval on PRs, E2E subset before deploy, full suite scheduled/nightly.
4. Export trace totals as CloudWatch EMF metrics and add dashboard/alarms for latency, errors, token/cost, and feedback.
5. Wire the prompt registry into traces/eval scorecards and add content-hash/version-bump enforcement.

**Does this currently support the claim "I have operated a production AI system"?**

**[Inferred]** It supports a narrower claim: "I designed, deployed, instrumented, and started evaluating a production-style AI/RAG system." It does not fully support "operated" unless Daniel can also show live trace samples, eval runs over time, feedback review outcomes, dashboards/alarms, and concrete incidents or regressions that were detected and fixed through that loop.

## 2. Architecture Assessment

### Baseline Git State

**[Observed]** Commands run:

```bash
git status --short
git branch --show-current
git log -1 --oneline
```

**[Observed]** Results:

- Branch: `main`
- Latest commit: `e83b421 chore: bump version to 0.10.0`
- Recent relevant commit: `3266dc4 feat(recruiter-assistant): prompt registry for explicit prompt versioning (#38)`
- Worktree is dirty with untracked files:
  - `AI_PRODUCTION_ROADMAP.md`
  - `docs/AI_PRODUCTION_READINESS_ROADMAP.md`
  - `docs/handoffs/reliability-layer-handoff.md`
  - `docs/recruiter-assistant-prompt-registry-handoff.md`

**[Observed]** `3266dc4` merged a pure-metadata prompt registry, registry docs, and tests. **[Observed]** The untracked handoff documents describe reliability work and follow-on prompt-registry usage work that is not present in tracked `main`. This report treats those files as context only, not implemented baseline behavior.

### Current Request Lifecycle

```text
Browser / Next.js static site
  -> useChat / recruiterAssistantFetch
  -> Lambda Function URL
  -> handleChatRequest
     -> /feedback route dispatch when path is /feedback
     -> method / origin / body / schema / size validation
     -> in-memory rate limit
     -> optional reCAPTCHA
     -> input guard
     -> OpenAI dependency creation from env or Secrets Manager
     -> request trace created with randomUUID()
     -> intent gate generateObject enum
     -> createDataStreamResponse
        -> runRecruiterAssistantPipeline
           -> thinking open marker
           -> contextAgent.createContext
              -> load interests pack
              -> embed retrieval queries
              -> LlamaIndex native / hydrated / custom retrieval
              -> retrieval summary + trace stats
           -> evidenceEvaluationAgent.evaluateEvidence streamText
           -> recruiterAgent.evaluateOffTopic
           -> hardGatesAgent.assessHardGates generateObject + deterministic clamp
           -> interestsAgent.scheduleEvaluation fire-and-forget generateText
           -> evidenceAnalysisAgent.analyzeEvidence streamText
           -> thinking close marker
           -> briefingAgent.streamBriefingPrep streamText
           -> chartAgent.projectChart generateObject
           -> recruiterAgent.generatePitch streamText + hard-gate clamp
           -> recruiterAgent.syncChartWithPitch
           -> referencesAgent.generateReferences
              -> claim extraction generateObject
              -> claim embeddings embedMany
              -> cosine match-back against corpus chunks
        -> log request trace
        -> fire-and-forget S3 trace write
```

### AI Stage Table

| Stage               | File / Function                                                   | Model Call                    | Input                                                    | Output                       | Failure Modes                                                                                                    | Traced / Evaluated                                                                    |
| ------------------- | ----------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Intent gate         | `src/security/intentGate.ts` / `runIntentGate`                    | `generateObject` enum         | guarded latest user text                                 | `RECRUITER` / `OFF_TOPIC`    | Provider error returns `intent_unclear`; successful off-topic return skips final trace logging                   | Success usage recorded manually; off-topic covered by `evals/e2e/cases.json`          |
| Retrieval embedding | `src/retrieval/embedRetrievalQueries.ts`                          | `embedMany`                   | raw JD + hard-gate expansion queries                     | query embeddings             | Provider error fails retrieval unless retriever fallback applies                                                 | `traceGenerate`; retrieval eval runner exists                                         |
| Retrieval           | `src/recruiterAssistant/agents/context/createRecruiterContext.ts` | No model beyond embedding     | query embeddings, locale corpus                          | top chunks, excerpts, scores | LlamaIndex failure may fall back only when configured                                                            | Retrieval stats in `RequestTrace`; eval cases under `evals/retrieval`                 |
| Evidence evaluation | `agents/evidenceEvaluation/evaluateEvidence.ts`                   | `streamText`                  | JD + source excerpts                                     | evaluator markdown           | Stream/provider failure bubbles to stream error                                                                  | Success usage via `makeStreamTraceOnFinish`; no error-stage trace for stream failures |
| Hard gates          | `agents/hardGates/extractHardGateRows.ts`                         | `generateObject`              | JD + evaluator markdown                                  | hard-gate rows               | Falls back to table parser on extraction failure                                                                 | `traceGenerate`; unit tests and hard-gate eval case data exist                        |
| Interests           | `agents/interests/evaluateInterests.ts`                           | `generateText`                | JD + private interests pack                              | server-only log              | Fire-and-forget, swallowed errors, late completion can miss trace because `RequestTrace.finish()` freezes stages | Best-effort trace only; unit tests exist                                              |
| Evidence analysis   | `agents/evidenceAnalysis/analyzeEvidence.ts`                      | `streamText`                  | JD + excerpts + evaluator + hard gates                   | analyst markdown             | Stream/provider failure bubbles                                                                                  | Success usage via `makeStreamTraceOnFinish`; no retry/timeout                         |
| Briefing prep       | `agents/briefing/streamBriefingPrep.ts`                           | `streamText`                  | evaluator + analyst markdown                             | transient stream marker text | Failure rejects `Promise.all` with chart                                                                         | Success usage via `makeStreamTraceOnFinish`; no dedicated eval                        |
| Chart projection    | `agents/chart/projectChart.ts`                                    | `generateObject`              | JD + evaluator + analyst + hard gates                    | chart JSON                   | Retries only compact mode after truncation; otherwise returns `null`                                             | `traceGenerate`; chart unit tests exist                                               |
| Pitch               | `agents/pitch/generatePitch.ts`                                   | `streamText`                  | message history + evidence brief + excerpts + hard gates | recruiter-facing markdown    | Stream/provider failure bubbles; hard-gate clamp after text                                                      | Success usage via `makeStreamTraceOnFinish`; E2E deterministic checks parse output    |
| References          | `src/rag/references.ts` / `buildReferencesMarkdown`               | `generateObject`, `embedMany` | final pitch + corpus chunks                              | `## References` + gaps       | Returns empty refs on claim extraction or embedding failure                                                      | `traceGenerate`; reference tests and reference eval case data exist                   |

### Architecture Strengths

- **[Observed]** Pipeline decomposition is clear and local: `runRecruiterAssistantPipeline.ts` is readable orchestration rather than a monolithic prompt.
- **[Observed]** Provider construction is centralized in `createRecruiterAssistantDependencies.ts`.
- **[Observed]** LlamaIndex/native/custom/compare retrieval variants share a `RecruiterRetriever` interface.
- **[Observed]** Hard gates have both LLM extraction and deterministic enforcement through `validateAndClampPitchHardGates`.
- **[Observed]** References perform post-response claim extraction and cosine match-back with support labels.

### Architecture Gaps

- **[Observed]** Stage failures are not uniformly captured. `traceGenerate` records awaited call failures, but `makeStreamTraceOnFinish` only records successful stream completion.
- **[Observed]** No explicit `AbortSignal`, timeout, retry, or retryable/non-retryable provider error classification is applied to production model calls.
- **[Observed]** The fire-and-forget interests stage can complete after `RequestTrace.finish()`, causing its trace stage to be dropped by design.
- **[Observed]** Trace persistence is best effort: `saveChatTrace` starts an unawaited S3 write and only logs write failures.

## 3. Maturity Assessment Table

| #   | Category                   | Score /10 | Confidence | Evidence                                                                                                               |
| --- | -------------------------- | --------: | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | AI Product Lifecycle       |       6.0 | High       | Product intent, deploy, eval assets, traces, feedback exist; no enforced improvement loop                              |
| 2   | Production AI Architecture |       8.0 | High       | Multi-stage pipeline, provider factory, retriever interface, hard gates, references                                    |
| 3   | Retrieval / RAG Quality    |       6.5 | High       | Real embeddings, LlamaIndex corpus, retrieval eval cases; no CI gate or ranking metrics beyond recall-style assertions |
| 4   | Evaluation                 |       5.0 | High       | Eval datasets and two runners exist; no judge automation, no CI, several case families lack runners                    |
| 5   | Observability              |       6.0 | High       | Request trace, latency, usage, cost, retrieval stats, S3 trace persistence; no metrics/dashboards/alarms               |
| 6   | Reliability                |       4.5 | High       | Some fallbacks; no timeouts/retries/cancellation/error taxonomy                                                        |
| 7   | Human-in-the-loop          |       4.5 | High       | Feedback UI/API/S3 exists; trace correlation is broken and no review-to-eval workflow exists                           |
| 8   | Cost Engineering           |       5.5 | High       | Token caps and estimated cost in traces; no budget alarms, cost dashboards, or routing/caching decisions               |
| 9   | Prompt Lifecycle           |       5.5 | High       | Prompt registry/docs/tests exist; no trace/eval stamping, content hashes, manifest, or version-bump guard              |
| 10  | Security / Safety          |       6.5 | High       | CORS, reCAPTCHA, rate limit, input guard, intent gate, Secrets Manager; privacy and injection gaps remain              |
| 11  | Maintainability            |       7.0 | High       | Strong docs/tests/CI; service workflow lacks eval/typecheck gates and docs have feedback privacy drift                 |

### 1. AI Product Lifecycle — 6.0 / 10

**[Observed]** The project now shows a loop starting to form: product intent is documented in `docs/plans/recruiter-assistant-plan.md`, implementation is staged, traces and feedback are persisted, and eval datasets exist under `evals/`. **[Observed]** The loop is not closed because feedback is not reliably joined to traces, evals are not CI-gated, and there is no documented process for promoting failed traces into eval cases.

Biggest risk: quality and UX regressions can still ship without measurable evidence.

Highest-leverage improvement: make feedback and traces joinable, then add a small CI eval gate.

### 2. Production AI Architecture — 8.0 / 10

**[Observed]** The AI pipeline has clear stages with separate files, model calls, and post-processing. Retrieval, prompting, hard-gate logic, chart repair, pitch generation, and references are separated. **[Observed]** Provider setup is centralized through `createOpenAI({ apiKey })`.

Biggest risk: the multi-call pipeline has many failure points and no uniform reliability layer.

Highest-leverage improvement: introduce a model-call wrapper for awaited and streaming stages.

### 3. Retrieval / RAG Quality — 6.5 / 10

**[Observed]** The index is built from portfolio content by `scripts/build-llamaindex-index.mjs`, uses `text-embedding-3-small`, publishes a canonical `llamaindex-index.json`, retrieves `RAG_TOP_K = 30`, and supports native/hydrated/custom/compare providers. **[Observed]** `evals/retrieval/cases.json` checks recall-like expectations and negative similarity thresholds.

Biggest risk: retrieval quality is measured locally and partially, not continuously. There is no nDCG, precision@k, per-locale coverage report, or CI threshold.

Highest-leverage improvement: run `eval:retrieval` in CI with a committed corpus snapshot and publish a small scorecard.

### 4. Evaluation — 5.0 / 10

**[Observed]** Evaluation artifacts are real: `evals/README.md`, `evals/e2e/cases.json`, `evals/retrieval/cases.json`, and case files for grounding, hard gates, recommendation, and references. **[Observed]** The committed scripts only run retrieval and E2E deterministic checks. The E2E runner explicitly prints rubric assertions for manual review rather than judging them automatically.

Biggest risk: the highest-value quality claims, especially groundedness and recommendation correctness, are not automatically scored.

Highest-leverage improvement: add LLM-as-judge or deterministic runners for grounding/references/recommendation, then gate a priority subset in CI.

### 5. Observability — 6.0 / 10

**[Observed]** `RequestTrace` records `requestId`, locale, outcome, total latency, retrieval stats, stage latency, status, token usage, and estimated cost. **[Observed]** `createRecruiterAssistantStreamResponse.ts` logs one final `recruiter.trace` and writes trace JSON to S3 when configured.

Biggest risk: logs are not the same as operations. There are no CloudWatch EMF metrics, dashboards, alarms, or trace completeness checks.

Highest-leverage improvement: emit one metrics envelope per request with p50/p95 latency, error rate, cost/request, token/request, and eval/feedback counters.

### 6. Reliability — 4.5 / 10

**[Observed]** There are useful localized fallbacks: hard-gate extraction falls back to table parsing, chart projection retries compact mode only after truncation, and retriever fallback can use the custom retriever when configured. **[Observed]** No production LLM/embedding call has an explicit timeout, retry policy, backoff, or cancellation signal.

Biggest risk: one transient OpenAI 429/5xx/network stall can fail or hang a multi-stage request.

Highest-leverage improvement: wrap all model/embedding calls with timeout budgets and retry classification; handle streaming stages carefully to avoid replaying emitted tokens.

### 7. Human-in-the-loop — 4.5 / 10

**[Observed]** Feedback UI and API are implemented, with positive/negative ratings, optional reasons, comments, session id, hashes, raw text, and S3 persistence. **[Observed]** The trace correlation mechanism is flawed: feedback `requestId` comes from the frontend assistant message id, while trace `requestId` is generated server-side with `randomUUID()`.

Biggest risk: production feedback cannot be reliably connected to the model calls, retrieved chunks, token/cost, or references that produced the response.

Highest-leverage improvement: stream or expose the backend `requestId` to the client and require feedback to use that id.

### 8. Cost Engineering — 5.5 / 10

**[Observed]** Token usage and estimated cost are captured in traces through `costEstimator.ts` and `pricing.ts`, and each stage has explicit token caps in `constants.ts`. **[Observed]** Cost data is not exported as a metric and there is no budget alarm or daily spend report.

Biggest risk: cost regressions are visible only if someone manually inspects logs or S3 traces.

Highest-leverage improvement: aggregate cost/request and daily estimated cost into CloudWatch metrics and alarm on spend anomalies.

### 9. Prompt Lifecycle — 5.5 / 10

**[Observed]** Prompt text lives in colocated markdown instruction files loaded by `getAgentInstruction.ts`, plus inline system prompt builders. **[Observed]** `promptRegistry.ts` registers nine prompt stages with `promptId`, semantic `version`, stage, source, description, owner, and `lastUpdated`; `promptRegistry.test.ts` checks lookup, uniqueness, semver/date metadata, loadable files, and bijection with the instruction loader. **[Observed]** `services/recruiter-assistant-api/docs/prompt-registry.md` states the registry is pure metadata and that trace/eval wiring is intentionally deferred.

Biggest risk: a prompt change has explicit metadata, but production traces and eval outputs still cannot prove which prompt version produced a specific answer or regression.

Highest-leverage improvement: attach `promptId` / `promptVersion` to `StageRecord`, stamp eval scorecards, and add content hashes plus CI checks that fail on prompt text drift without a version bump.

### 10. Security / Safety — 6.5 / 10

**[Observed]** The security baseline is credible for a public portfolio assistant: exact-origin CORS, optional reCAPTCHA, rate limiting, input guard, intent gate, Secrets Manager, no committed `.env`, and write-only feedback bucket guidance. **[Observed]** Gaps remain: prompt-injection blocking is regex-based, rate limiting is per-instance memory, feedback stores raw job text/response text, and output privacy/redaction is not documented.

Biggest risk: user-provided job descriptions can contain sensitive employer data, and the current feedback schema persists that text.

Highest-leverage improvement: write a privacy/threat model and either store hashes-only by default or document retention, consent, redaction, and access controls.

### 11. Maintainability — 7.0 / 10

**[Observed]** The codebase is modular, the docs are unusually strong, and the service has many focused unit tests. **[Observed]** The recruiter workflow does not run service evals, service format/lint, or `tsc --noEmit`; `npm run build` uses esbuild and does not typecheck. **[Observed]** Docs have drift: `docs/plans/recruiter-assistant-plan.md` says feedback stores only hashes, while the schema requires raw `questionText` and `responseText`.

Biggest risk: productionization work can regress quietly because guardrails are documented but not enforced.

Highest-leverage improvement: add service-specific format/lint/typecheck/eval gates to `.github/workflows/recruiter-api.yml`.

## 4. Findings

### High Severity

### F1 — Feedback cannot be reliably correlated with backend traces

Severity: High
Category: Human-in-the-loop / Observability
Evidence: **[Observed]** `handleChatRequest.ts` creates a backend trace with `randomUUID()` and `saveChatTrace(trace.requestId, trace.toLog())`. **[Observed]** `src/features/recruiter-assistant/lib/recruiter-assistant-feedback.ts` sends `requestId: messageId`. **[Observed]** `RecruiterChat.tsx` passes `messageId={m.id}` to `AssistantFeedback`. No search result showed the backend trace id being sent to the frontend.
Impact: Feedback S3 records and trace S3 records cannot be joined by `requestId`, so real user feedback cannot become a reliable debugging or eval signal.
Recommendation: Expose the backend trace id in the data stream or response metadata and persist it with the assistant message.
Suggested first PR: Add a `[[REQUEST_TRACE_ID:<uuid>]]` data-stream marker or AI SDK metadata part, parse it client-side, and make `feedback.requestId` use the backend id. Add an integration test.

### F2 — No production reliability wrapper around LLM or embedding calls

Severity: High
Category: Reliability
Evidence: **[Observed]** Searches for `retry`, `backoff`, `timeout`, `AbortController`, `AbortSignal`, and `maxRetries` found no production model-call wrapper. `projectChart.ts` retries compact chart projection only for truncation. Model calls in `evaluateEvidence.ts`, `analyzeEvidence.ts`, `generatePitch.ts`, `extractHardGateRows.ts`, `references.ts`, and `embedRetrievalQueries.ts` pass no explicit timeout or retry controls.
Impact: Transient 429/5xx/network failures can fail a whole request, and slow calls can consume the Lambda timeout budget unpredictably.
Recommendation: Add a reliability layer with per-stage timeout budgets, retryable/non-retryable error classification, jittered backoff, and cancellation support. Streaming stages should use SDK-level pre-stream retries only.
Suggested first PR: `services/recruiter-assistant-api/src/reliability/withReliability.ts` plus tests for 429 retry, timeout, non-retryable failure, and cancellation.

### F3 — Evals exist but are not enforced in CI

Severity: High
Category: Evaluation
Evidence: **[Observed]** `services/recruiter-assistant-api/package.json` has `eval:snapshot`, `eval:retrieval`, and `eval:e2e`. **[Observed]** `.github/workflows/recruiter-api.yml` runs only `npm test`, `npm run build`, and deployment/index upload jobs.
Impact: Prompt, model, retrieval, and corpus changes can degrade quality without blocking a PR or deploy.
Recommendation: Run `eval:retrieval` on PRs and a cost-bounded `eval:e2e -- --case ...` priority subset before deploy; store scorecards as artifacts.
Suggested first PR: Add a `quality-evals` job to `recruiter-api.yml` with a pinned corpus snapshot and priority E2E cases.

### F4 — Feedback privacy docs contradict the implemented schema

Severity: High
Category: Security / Human-in-the-loop
Evidence: **[Observed]** `docs/plans/recruiter-assistant-plan.md` says "no raw question/response text stored — only SHA-256 hex". **[Observed]** `feedbackSchema.ts` requires `questionText` and `responseText`, and `recruiter-assistant-feedback.ts` sends both raw fields.
Impact: A recruiter may paste confidential JD or company context; feedback storage can retain that raw data despite docs saying otherwise. This is both a privacy risk and an interview credibility risk.
Recommendation: Choose and document one policy. Prefer hashes by default, with explicit opt-in/sampled raw text only if needed for debugging and with retention/access controls.
Suggested first PR: Remove raw text from feedback records or add a privacy-reviewed `includeRawText` path with retention and redaction. Update docs and tests.

### F5 — Intent-gate early exits are not finalized into request traces

Severity: High
Category: Observability
Evidence: **[Observed]** `handleChatRequest.ts` creates a trace before `runIntentGate`, but when `!intent.ok`, it returns `clientErrorResponse(...)` without `trace.finish()`, `logRequestTrace(trace)`, or `saveChatTrace(...)`. **[Observed]** `intentGate.ts` records only successful classifier usage; classifier exceptions are caught and returned as `intent_unclear` without an error stage.
Impact: Off-topic and intent-failure traffic is invisible in the main trace store, including token/cost spend and abuse volume.
Recommendation: Finalize and persist traces for all post-trace-created outcomes, including off-topic and intent failures.
Suggested first PR: Wrap intent handling in `try/finally`, set outcomes such as `rejected_off_topic` / `rejected_intent_unclear`, and record intent error stages.

### F6 — Prompt registry metadata is not yet runtime- or eval-traceable

Severity: High
Category: Prompt Lifecycle
Evidence: **[Observed]** `promptRegistry.ts` and `promptRegistry.test.ts` now exist and register nine prompt stages. **[Observed]** `services/recruiter-assistant-api/docs/prompt-registry.md` explicitly says the registry changes no runtime behavior and that adding `promptId` / `promptVersion` to `StageRecord` is deferred. **[Observed]** `requestTrace.ts` `StageRecord` has no prompt fields, and searches found no generated prompt manifest, content hash, or eval-stamping code in tracked source.
Impact: A production trace still cannot identify which prompt version produced an answer; prompt metadata exists but is not yet connected to feedback, trace review, or eval deltas.
Recommendation: Wire `getPromptByStage(stage)` into stage recording, stamp prompt versions into eval output, and add content hashes plus version-bump CI checks.
Suggested first PR: Add optional `promptId` / `promptVersion` to `StageRecord`, cover registered and unregistered stages in `requestTrace.test.ts`, and print/persist `promptId@version` in `eval:e2e` score output.

### Medium Severity

### F7 — Observability remains log/S3 based, not metrics based

Severity: Medium
Category: Observability / Operations
Evidence: **[Observed]** Searches found no `putMetricData`, `CloudWatch` metric emission, `OpenTelemetry`, `otel`, `Langfuse`, or `LangSmith` code. `SETUP.md` creates only a CloudWatch log group.
Impact: Operators cannot see p95 latency, error rate, token/cost per request, or trace completeness without log queries or S3 analysis.
Recommendation: Emit CloudWatch EMF metrics from the final trace envelope and add dashboard/alarm definitions.
Suggested first PR: Convert `trace.toLog().totals` and stage summaries into an EMF log object with dimensions for stage, outcome, locale, and model.

### F8 — Streaming stage failures are not stage-traced

Severity: Medium
Category: Observability / Reliability
Evidence: **[Observed]** Streamed stages use `makeStreamTraceOnFinish(...)`, which only records on successful `onFinish`. There is no symmetric `onError` stage record for `streamText` failures.
Impact: A failed stream can show only request-level `errorName`, not which model stage failed or how long it ran.
Recommendation: Wrap stream setup and consumption so failures record `{ stage, status: "error", latencyMs, errorName }` before rethrowing.
Suggested first PR: Add `traceStreamTextStage` helper and migrate evaluator, analyst, briefing prep, and pitch.

### F9 — E2E eval rubrics are manual, not judged

Severity: Medium
Category: Evaluation
Evidence: **[Observed]** `scripts/eval-e2e.mjs` states rubric assertions are printed but not auto-graded, and `printCaseResult` labels them "Rubric (manual review)".
Impact: Groundedness, contradiction, and recommendation rationale quality still depend on human spot checks.
Recommendation: Add deterministic parsers where possible and an LLM-as-judge for rubric checks with sampled human calibration.
Suggested first PR: Implement a `judge:e2e` script that scores each rubric assertion as pass/fail/unclear and writes a JSON scorecard.

### F10 — Several committed eval case families have no runner

Severity: Medium
Category: Evaluation
Evidence: **[Observed]** `evals/grounding`, `evals/hard-gates`, `evals/recommendation`, and `evals/references` have `cases.json` files, but `package.json` exposes only `eval:retrieval` and `eval:e2e`.
Impact: Good test design exists as data but cannot yet catch regressions automatically.
Recommendation: Add runners for hard-gates and references first because those can be mostly deterministic.
Suggested first PR: Add `eval:hard-gates` and `eval:references`, then wire them into CI.

### F11 — Feedback endpoint and S3 writer lack direct tests

Severity: Medium
Category: Human-in-the-loop / Maintainability
Evidence: **[Observed]** Search found tests for `feedbackBodySchema`, but no tests for `handleFeedbackRequest`, `writeFeedbackToS3`, `saveChatTrace`, or the frontend `submitFeedback` fetch body.
Impact: The newest production-learning loop can regress at the API boundary, CORS/rate-limit path, S3 key shape, or client payload without a failing test.
Recommendation: Add focused tests with mocked S3 client/fetch and a handler test for `/feedback`.
Suggested first PR: Test positive/negative feedback POST, invalid body, forbidden origin, missing bucket no-op, and S3 key shape.

### F12 — Trace persistence is best effort and can silently drop traces

Severity: Medium
Category: Observability
Evidence: **[Observed]** `saveChatTrace` calls `void putJson(...)`; `putJson` catches S3 write errors and logs them, but the request does not await or expose trace persistence success.
Impact: The system can claim trace persistence while missing traces under S3/IAM/network failures.
Recommendation: Track trace persistence failures as a metric and consider awaiting trace writes for sampled requests or writing to a durable queue.
Suggested first PR: Emit `trace_persist_failed` metrics and add tests around `putJson` error handling.

### F13 — Rate limiting is per-instance and ephemeral

Severity: Medium
Category: Security / Reliability
Evidence: **[Observed]** `rateLimit.ts` stores counters in a module-level `Map`, and comments state it resets on Lambda cold start. `SETUP.md` relies on reserved concurrency as a coarse abuse ceiling.
Impact: Multiple warm Lambda instances, cold starts, or distributed abuse can bypass the intended request cap.
Recommendation: Use WAF, CloudFront rate-based rules, API Gateway usage plans, or DynamoDB/Redis-backed counters if abuse becomes material.
Suggested first PR: Document the current abuse model and add WAF/rate-based-rule setup for production.

### F14 — Service CI does not typecheck, format-check, or lint the service explicitly

Severity: Medium
Category: Maintainability
Evidence: **[Observed]** `services/recruiter-assistant-api/tsconfig.json` has `noEmit: true`, but `package.json` has no `typecheck` script. `.github/workflows/recruiter-api.yml` runs service `npm test` and `npm run build`; esbuild does not typecheck.
Impact: Type-level regressions can slip through unless root CI happens to catch them.
Recommendation: Add service `typecheck`, `format:check`, and lint gates in the service workflow.
Suggested first PR: Add `typecheck: tsc --noEmit`, service lint or root lint coverage confirmation, and update `recruiter-api.yml`.

## 5. Prioritized Roadmap

### Phase 1 — Visibility

Goal: make the system inspectable and joinable.

| Item                                 | Priority | Expected Impact                                                    | Complexity | Interview Value | Dependencies              | Suggested First PR                                                                  |
| ------------------------------------ | -------- | ------------------------------------------------------------------ | ---------- | --------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| Fix feedback trace id correlation    | P0       | Turns feedback into debuggable production data                     | S          | Very high       | Existing trace + feedback | Expose backend `requestId` to client and use it in feedback                         |
| Finalize traces on rejected requests | P0       | Shows off-topic, abuse, intent failures, and rejected-request cost | S          | High            | Existing `RequestTrace`   | Ensure intent/off-topic paths call `finish`, `logRequestTrace`, and `saveChatTrace` |
| CloudWatch EMF metrics from traces   | P1       | Makes latency/cost/errors queryable and alarmable                  | M          | High            | Complete traces           | Emit metrics from final trace envelope                                              |
| Trace persistence health metric      | P1       | Detects missing trace/feedback objects                             | S          | Medium          | EMF metrics               | Count S3 trace/feedback write failures                                              |
| Retrieval diagnostics scorecard      | P2       | Makes RAG behavior inspectable by query/case                       | S-M        | Medium          | Eval snapshot             | Persist top-k chunk ids/scores for retrieval eval runs                              |

### Phase 2 — Evaluation

Goal: make quality measurable.

| Item                                       | Priority | Expected Impact                                     | Complexity | Interview Value | Dependencies                | Suggested First PR                                           |
| ------------------------------------------ | -------- | --------------------------------------------------- | ---------- | --------------- | --------------------------- | ------------------------------------------------------------ |
| Run retrieval eval in CI                   | P0       | Catches corpus/retrieval regressions cheaply        | S          | High            | Corpus snapshot policy      | Add `eval:retrieval` CI job                                  |
| Run priority E2E eval subset before deploy | P1       | Catches end-to-end product failures                 | M          | Very high       | Dev server + API key        | Add cost-bounded E2E CI job for `E2E-02`, `E2E-03`, `E2E-04` |
| Add hard-gate eval runner                  | P1       | Validates one of the highest-risk decision controls | M          | High            | Existing `evals/hard-gates` | Deterministic runner over hard-gate case data                |
| Add references/grounding judge             | P1       | Measures faithfulness, gaps, and citation support   | M-L        | Very high       | Trace/corpus access         | LLM-as-judge plus deterministic citation support checks      |
| Scorecard artifacts                        | P2       | Makes quality history reviewable                    | S          | High            | Eval runners                | Write JSON/Markdown scorecards and upload in CI              |

### Phase 3 — Reliability

Goal: make failures predictable and recoverable.

| Item                                  | Priority | Expected Impact                                            | Complexity | Interview Value | Dependencies                  | Suggested First PR                                                  |
| ------------------------------------- | -------- | ---------------------------------------------------------- | ---------- | --------------- | ----------------------------- | ------------------------------------------------------------------- |
| Reliability wrapper for awaited calls | P0       | Reduces failures from transient provider errors            | M          | Very high       | Trace helpers                 | Add `runModelStage` with timeout/retry/error classification         |
| Streaming reliability helper          | P0       | Records stream failures and avoids unsafe replay           | M          | Very high       | Trace helpers                 | Add `streamModelStage` with stage timeout and error stage recording |
| Request cancellation                  | P1       | Avoids wasting tokens after client disconnect              | M          | High            | Lambda stream close detection | Propagate `AbortSignal` through pipeline                            |
| Graceful degradation policy           | P1       | Allows noncritical stages to fail without losing the pitch | M          | High            | Reliability wrappers          | Define fail-open/fail-closed per stage                              |
| Staging validation playbook           | P2       | Proves reliability behavior in Lambda, not only unit tests | S          | Medium          | Deployed dev Lambda           | Add manual/staging test plan                                        |

### Phase 4 — Human Feedback

Goal: close the production learning loop.

| Item                           | Priority | Expected Impact                           | Complexity | Interview Value | Dependencies                   | Suggested First PR                                         |
| ------------------------------ | -------- | ----------------------------------------- | ---------- | --------------- | ------------------------------ | ---------------------------------------------------------- |
| Privacy-safe feedback schema   | P0       | Reduces PII/confidential JD risk          | S-M        | High            | Product decision               | Hash-only by default or explicit raw-text retention policy |
| Feedback endpoint/client tests | P0       | Protects newest production loop           | S          | Medium          | Existing feedback code         | Add handler/S3/client tests                                |
| Feedback review workflow       | P1       | Turns thumbs-down into actionable triage  | M          | Very high       | Trace correlation              | Script to list negative feedback with trace summary        |
| Promote feedback to eval cases | P1       | Creates real production learning flywheel | M          | Very high       | Review workflow + eval runners | Generate candidate eval cases from reviewed failures       |
| Feedback dashboard             | P2       | Tracks feedback rate and quality drift    | S-M        | Medium          | EMF/trace metrics              | Feedback rate, thumbs-down rate, reason distribution       |

### Phase 5 — Operationalization

Goal: make the system presentable as operated software.

| Item                               | Priority | Expected Impact                     | Complexity | Interview Value | Dependencies      | Suggested First PR                                        |
| ---------------------------------- | -------- | ----------------------------------- | ---------- | --------------- | ----------------- | --------------------------------------------------------- |
| CloudWatch dashboard and alarms    | P0       | Demonstrates real operations        | S-M        | Very high       | EMF metrics       | Dashboard JSON plus alarms for error, latency, cost       |
| Prompt trace/eval stamping         | P1       | Makes prompt changes auditable      | M          | Very high       | Existing registry | Trace fields, eval scorecard labels, manifest/hash checks |
| Eval gate with baseline thresholds | P1       | Prevents silent quality regressions | M          | Very high       | Eval runners      | CI compares scorecard to baseline                         |
| Runbook and SLOs                   | P1       | Turns deployed into operated        | S          | High            | Metrics/dashboard | `docs/RUNBOOK.md` and `docs/SLO.md`                       |
| Cost guardrails                    | P2       | Prevents runaway spend              | S-M        | Medium          | Cost metrics      | Daily budget alarm and optional per-session token cap     |

## 6. Concrete First PRs

### PR 1 — Correlate Feedback with Backend Request Trace

Problem: Feedback records use the frontend message id as `requestId`, while traces use backend UUIDs.

Files likely touched:

- `services/recruiter-assistant-api/src/handleChatRequest.ts`
- `services/recruiter-assistant-api/src/recruiterAssistant/createRecruiterAssistantStreamResponse.ts`
- `src/features/recruiter-assistant/components/RecruiterChat.tsx`
- `src/features/recruiter-assistant/lib/recruiter-assistant-feedback.ts`
- Feedback tests

Implementation outline:

- Emit backend `trace.requestId` into the data stream as metadata or a stripped marker.
- Store the trace id with the assistant message.
- Send the backend trace id in `/feedback`.
- Reject or flag feedback without a backend trace id.

Tests:

- Client parses/stores trace id.
- Feedback body uses backend id, not message id.
- Backend trace and feedback keys can be joined by `requestId`.

Acceptance criteria:

- Every feedback record has a `requestId` matching an existing trace id.
- Existing message id can remain as `assistantMessageId` if useful.

Interview language:

> I wired human feedback to the exact AI trace that produced the answer, so a thumbs-down can be inspected with retrieved chunks, model stages, latency, tokens, and cost.

### PR 2 — Add Reliability Wrapper for Model and Embedding Calls

Problem: Model calls lack explicit timeout/retry/backoff/cancellation behavior.

Files likely touched:

- `services/recruiter-assistant-api/src/reliability/*`
- All model call sites under `src/recruiterAssistant/agents/**`
- `src/rag/references.ts`
- `src/retrieval/embedRetrievalQueries.ts`
- `src/security/intentGate.ts`

Implementation outline:

- Define per-stage timeout and retry policies.
- Classify provider errors: retryable 429/5xx/network, non-retryable schema/input, timeout, cancelled.
- Use `AbortSignal` for per-call timeouts.
- Use SDK/internal retry only for streaming pre-output behavior; do not replay bytes after streaming starts.

Tests:

- 429 then success retries.
- Timeout aborts.
- Non-retryable error fails fast.
- Streaming failure records stage error.

Acceptance criteria:

- All model/embedding calls have a stage policy.
- Trace stages include attempts/retried/timedOut/errorClass.

Interview language:

> I treated every LLM call as an unreliable network dependency with stage-specific timeout budgets and retry policies, and I made streaming retries safe by avoiding replay after bytes have been emitted.

### PR 3 — Add CI Retrieval Eval Gate

Problem: Retrieval eval assets exist but are not enforced.

Files likely touched:

- `.github/workflows/recruiter-api.yml`
- `services/recruiter-assistant-api/package.json`
- `evals/retrieval/fixtures/corpus-snapshot.json`
- `evals/README.md`

Implementation outline:

- Commit or generate a deterministic corpus snapshot for CI.
- Run `npm run eval:retrieval` on PRs touching corpus, retrieval, prompts, or service code.
- Upload a retrieval scorecard artifact.

Tests:

- CI dry run locally where possible.
- One negative test and one positive test fail when expected.

Acceptance criteria:

- Retrieval eval failures block the recruiter API workflow.
- CI output reports pass/fail counts and critical failures.

Interview language:

> Retrieval quality is not only unit-tested; I gate corpus and retriever changes against labeled recall and negative cases.

### PR 4 — Add Hard-Gate and References Eval Runners

Problem: Several eval case families are committed but not executable.

Files likely touched:

- `services/recruiter-assistant-api/scripts/eval-hard-gates.mjs`
- `services/recruiter-assistant-api/scripts/eval-references.mjs`
- `services/recruiter-assistant-api/package.json`
- `evals/hard-gates/cases.json`
- `evals/references/cases.json`

Implementation outline:

- Run hard-gate cases through extraction + deterministic clamp logic.
- Run reference cases through claim-to-chunk support checks.
- Output JSON and Markdown scorecards.

Tests:

- Runner exits nonzero on a synthetic failing case.
- Runner handles missing fixture files clearly.

Acceptance criteria:

- `npm run eval:hard-gates` and `npm run eval:references` exist.
- Priority cases can be added to CI.

Interview language:

> I separated deterministic AI safety checks from broader E2E evals so hard gates and references could be regression-tested cheaply.

### PR 5 — Make Trace Logs Operational Metrics

Problem: Trace data exists but is not exported as metrics.

Files likely touched:

- `services/recruiter-assistant-api/src/tracing/requestTrace.ts`
- `services/recruiter-assistant-api/src/logging/logger.ts`
- `services/recruiter-assistant-api/SETUP.md`
- Optional dashboard JSON under `docs/` or `infra/`

Implementation outline:

- Emit CloudWatch EMF for request totals and per-stage summaries.
- Add dimensions: environment, locale, model, stage, outcome.
- Add alarms for error rate, p95 latency, and estimated daily cost.

Tests:

- EMF payload shape snapshot.
- Cost/tokens propagate into metrics.

Acceptance criteria:

- CloudWatch can graph p95 total latency, stage latency, tokens/request, cost/request, and error rate.

Interview language:

> The system emits an AI trace and operational metrics from the same envelope, so debugging and dashboards agree.

### PR 6 — Wire Prompt Registry into Traces and Evals

Problem: Prompt versions now exist as metadata, but runtime traces and eval scorecards do not record them.

Files likely touched:

- `services/recruiter-assistant-api/src/recruiterAssistant/prompt/promptRegistry.ts`
- `services/recruiter-assistant-api/src/tracing/requestTrace.ts`
- `services/recruiter-assistant-api/scripts/eval-e2e.mjs`
- `services/recruiter-assistant-api/prompts.manifest.json` or generated equivalent
- Prompt integrity tests
- CI workflow

Implementation outline:

- Attach prompt id/version to `StageRecord`.
- Print and persist `promptId@version` in eval output.
- Generate a prompt manifest with content hashes.
- Fail CI when prompt text changes without a version bump.

Tests:

- Registered stage records include prompt id/version.
- Unregistered technical stages such as `retrieval_embed` and `references_embed` remain valid without prompt metadata.
- Hash drift fails tests.

Acceptance criteria:

- Every trace can identify the prompt version used for each prompt-backed stage.
- Eval output records the prompt versions used for the run.

Interview language:

> Prompt versions are first-class runtime and eval metadata, so a production answer and an eval result can be traced back to the exact prompt revision.

### PR 7 — Align Feedback Privacy Policy and Implementation

Problem: Docs say hashes only; code stores raw question and response text.

Files likely touched:

- `services/recruiter-assistant-api/src/feedback/feedbackSchema.ts`
- `src/features/recruiter-assistant/lib/recruiter-assistant-feedback.ts`
- `docs/plans/recruiter-assistant-plan.md`
- `services/recruiter-assistant-api/SETUP.md`
- Feedback tests

Implementation outline:

- Decide whether raw text is allowed.
- If not, remove raw fields and store hashes plus reason/comment only.
- If yes, document retention, access, consent, redaction, and lifecycle policy.

Tests:

- Schema rejects raw text when hashes-only.
- Docs and implementation match.

Acceptance criteria:

- Feedback storage behavior matches documented privacy language.

Interview language:

> I treated feedback as production data, not just UX telemetry, and made the privacy/retention tradeoff explicit.

## 7. Interview Narrative

Bad answer:

> I built a RAG chatbot using OpenAI.

Better answer:

> I built a multi-stage recruiter-assistant RAG system and then started productionizing it with request-level AI traces, per-stage token/cost tracking, retrieval and E2E eval datasets, S3-backed feedback capture, hard-gate enforcement, grounded reference generation, and explicit prompt metadata. The next step was closing the loop: CI eval gates, trace-linked feedback review, reliability wrappers, prompt-version trace stamping, and CloudWatch dashboards.

Interview-ready bullets:

- **[Observed]** The assistant is not a single prompt. It has staged retrieval, evaluator, hard-gate, analyst, chart, pitch, and references stages.
- **[Observed]** Every completed streamed request emits a structured AI trace with per-stage latency, token usage, estimated cost, retrieval stats, outcome, and total request cost.
- **[Observed]** Retrieval is evaluated separately from generation with labeled recall-style cases and negative cases for absent skills like Golang or German.
- **[Observed]** E2E evals exercise realistic JD fixtures and parse deterministic final-output properties such as recommendation, technical fit, references, and gaps.
- **[Observed]** Human feedback is captured with thumbs up/down, reason, comment, hashes, session id, and S3 persistence.
- **[Inferred]** The trace-feedback join needs to be fixed before the feedback loop can be described as production-grade.
- **[Observed]** Prompt versions are now explicit metadata in a registry, but they are not yet stamped into request traces or eval scorecards.
- **[Observed]** Hard gates are not only prompt instructions; they are extracted, scored, and used to clamp pitch/chart output after generation.
- **[Observed]** Reference generation performs post-response claim extraction and vector match-back against portfolio chunks, surfacing weak support and gaps.
- **[Observed]** Security is layered with CORS, reCAPTCHA, rate limiting, input guard, LLM intent gate, and Secrets Manager.
- **[Inferred]** The strongest next interview artifact would be a dashboard plus a CI eval scorecard showing quality and cost over time.

Before / after examples:

- Before: "I built a portfolio AI assistant."
- After: "I built a streamed, multi-stage RAG assistant with explicit hard-gate enforcement, traceable model stages, cost estimates, retrieval diagnostics, feedback capture, and a roadmap to turn production failures into eval cases."

- Before: "It uses RAG to avoid hallucinations."
- After: "The system retrieves locale-filtered chunks, uses those chunks in evaluator and analyst stages, clamps final recommendations with deterministic hard-gate logic, then extracts final claims and matches them back to corpus chunks with cosine support labels."

- Before: "I added tests."
- After: "I separated code behavior tests from AI quality evals: unit tests cover parsers and guards, retrieval evals cover labeled recall, and E2E evals run full JD fixtures through the pipeline."

## 8. Evidence Appendix

### Important Files Inspected

- `services/recruiter-assistant-api/src/handleChatRequest.ts`
- `services/recruiter-assistant-api/src/recruiterAssistant/createRecruiterAssistantStreamResponse.ts`
- `services/recruiter-assistant-api/src/recruiterAssistant/pipeline/runRecruiterAssistantPipeline.ts`
- `services/recruiter-assistant-api/src/tracing/requestTrace.ts`
- `services/recruiter-assistant-api/src/tracing/costEstimator.ts`
- `services/recruiter-assistant-api/src/tracing/pricing.ts`
- `services/recruiter-assistant-api/src/recruiterAssistant/prompt/promptRegistry.ts`
- `services/recruiter-assistant-api/docs/prompt-registry.md`
- `services/recruiter-assistant-api/src/feedback/feedbackSchema.ts`
- `services/recruiter-assistant-api/src/feedback/writeFeedbackToS3.ts`
- `services/recruiter-assistant-api/src/handleFeedbackRequest.ts`
- `src/features/recruiter-assistant/components/AssistantFeedback.tsx`
- `src/features/recruiter-assistant/lib/recruiter-assistant-feedback.ts`
- `services/recruiter-assistant-api/scripts/eval-e2e.mjs`
- `services/recruiter-assistant-api/scripts/eval-retrieval.mjs`
- `evals/README.md`
- `evals/e2e/cases.json`
- `evals/retrieval/cases.json`
- `.github/workflows/recruiter-api.yml`
- `.github/workflows/ci.yml`
- `docs/plans/recruiter-assistant-plan.md`
- `services/recruiter-assistant-api/SETUP.md`

### Important Tests Inspected

- `services/recruiter-assistant-api/tests/requestTrace.test.ts`
- `services/recruiter-assistant-api/tests/costEstimator.test.ts`
- `services/recruiter-assistant-api/tests/promptRegistry.test.ts`
- `services/recruiter-assistant-api/tests/feedbackSchema.test.ts`
- `services/recruiter-assistant-api/tests/goldenRetrieval.test.ts`
- `services/recruiter-assistant-api/tests/hardGates.compute.test.ts`
- `services/recruiter-assistant-api/tests/hardGates.enforcePitch.test.ts`
- `services/recruiter-assistant-api/tests/references.test.ts`
- `services/recruiter-assistant-api/tests/intentGate.test.ts`
- `services/recruiter-assistant-api/tests/parseAndValidateRecruiterRequest.test.ts`
- `services/recruiter-assistant-api/tests/rateLimit.test.ts`
- `services/recruiter-assistant-api/tests/verifyRecaptcha.test.ts`

### Important Commands Run

```bash
git status --short
git status --short --branch
git status --short --untracked-files=all
git status --short --branch --untracked-files=all
git branch --show-current
git log -1 --oneline
git log -5 --oneline
git show --stat --oneline HEAD
git show --stat --oneline HEAD~4..HEAD
git ls-files evals services/recruiter-assistant-api/scripts/eval-e2e.mjs services/recruiter-assistant-api/scripts/eval-retrieval.mjs services/recruiter-assistant-api/scripts/eval-snapshot-corpus.mjs
git ls-files services/recruiter-assistant-api/src/recruiterAssistant/prompt/promptRegistry.ts services/recruiter-assistant-api/docs/prompt-registry.md services/recruiter-assistant-api/prompts.manifest.json services/recruiter-assistant-api/tests/promptIntegrity.test.ts services/recruiter-assistant-api/tests/promptManifest.test.ts
rg -n "generateText|generateObject|streamText|embed|embedMany" src services/recruiter-assistant-api .github docs package.json -g '!node_modules' -g '!dist' -g '!*.map'
rg -n "usage|tokens|promptTokens|completionTokens|totalTokens" src services/recruiter-assistant-api .github docs package.json -g '!node_modules' -g '!dist' -g '!*.map'
rg -n "retry|backoff|timeout|AbortController|AbortSignal|maxRetries" src services/recruiter-assistant-api .github docs package.json -g '!node_modules' -g '!dist' -g '!*.map'
rg -n "putMetricData|CloudWatch|OpenTelemetry|otel|trace|span|Langfuse|LangSmith|correlation|requestId|EMF" src services/recruiter-assistant-api .github docs package.json -g '!node_modules' -g '!dist' -g '!*.map'
rg -n "feedback|rating|thumb|useful|not useful" src services/recruiter-assistant-api .github docs package.json -g '!node_modules' -g '!dist' -g '!*.map'
rg -n "eval|evaluation|golden|judge|faithfulness|grounded|groundedness|recall|precision|nDCG|ndcg" src services/recruiter-assistant-api .github docs package.json -g '!node_modules' -g '!dist' -g '!*.map'
rg -n "prompt|instruction|system" services/recruiter-assistant-api/src services/recruiter-assistant-api/tests services/recruiter-assistant-api/scripts services/recruiter-assistant-api/package.json docs -g '!node_modules' -g '!dist' -g '!*.map'
rg -n "getPromptByStage|promptId|promptVersion|contentHash|manifest|prompts.manifest|listPrompts" services/recruiter-assistant-api/src services/recruiter-assistant-api/tests services/recruiter-assistant-api/docs .github -g '!node_modules' -g '!dist' -g '!*.map'
rg -n "OPENAI|ANTHROPIC|apiKey|SecretsManager|secret|FEEDBACK|RECAPTCHA|ALLOWED_ORIGIN|CORS" src services/recruiter-assistant-api .github docs package.json -g '!node_modules' -g '!dist' -g '!*.map'
rg -n "handleFeedbackRequest|/feedback|writeFeedbackToS3|saveChatTrace|FEEDBACK_S3_BUCKET" services/recruiter-assistant-api/tests src/features/recruiter-assistant -g '!node_modules'
```

### Checked and Rejected Findings

- **"There is no human feedback." Rejected.** **[Observed]** Feedback UI, endpoint, schema, and S3 writer exist in `main`.
- **"There is no trace or cost capture." Rejected.** **[Observed]** `RequestTrace`, `costEstimator`, `pricing`, and request trace tests exist.
- **"There are no evals." Rejected.** **[Observed]** `evals/` contains a meaningful dataset and retrieval/E2E scripts exist.
- **"Embeddings are only mocked." Rejected for runtime, partially true for some tests.** **[Observed]** Runtime index build and retrieval eval use `text-embedding-3-small`; some unit tests intentionally mock embeddings.
- **"Secrets are committed." Rejected.** **[Observed]** `.gitignore` ignores `.env*`, and production OpenAI key resolution supports Secrets Manager.
- **"The provider is Anthropic." Rejected.** **[Observed]** `createRecruiterAssistantDependencies.ts` uses `createOpenAI`, and constants use OpenAI model ids.
- **"The assistant is a monolithic prompt." Rejected.** **[Observed]** The pipeline is stage-based and has separate agents.
- **"There is no prompt registry." Rejected after `3266dc4`.** **[Observed]** `promptRegistry.ts`, `services/recruiter-assistant-api/docs/prompt-registry.md`, and `promptRegistry.test.ts` exist; the remaining gap is runtime/eval stamping and enforcement.
- **"There is no security." Rejected.** **[Observed]** There is CORS, rate limiting, reCAPTCHA, input guard, intent gate, Secrets Manager, and private S3 guidance.

### Assumptions Requiring Validation

- **[Assumption]** The production Lambda has `FEEDBACK_S3_BUCKET`, `ALLOWED_ORIGIN`, `RECAPTCHA_SECRET_KEY`, and Function URL CORS configured as documented. This was not validated against AWS.
- **[Assumption]** S3 trace and feedback objects are actually being written in production. Code supports it, but no live S3 object listing was inspected.
- **[Assumption]** OpenAI pricing in `pricing.ts` is still accurate for configured models. The file says prices were captured in 2026-06, but pricing should be reverified when models/env values change.
- **[Assumption]** The eval runners have been run recently. The repo contains scripts and cases, but no recent scorecard artifact was found in the tracked tree.
