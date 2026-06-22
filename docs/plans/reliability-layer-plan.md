# Recruiter Assistant — Reliability Layer Plan

**Status:** Proposed (not yet implemented). **Last updated:** 2026-06-22.

Scope: add a **minimal reliability layer** — per-stage timeouts, bounded retries with backoff, honest graceful degradation, and request cancellation support — to the recruiter-assistant AI pipeline. Tracing, the eval dataset, and the feedback loop are already in place; this plan extends them, it does not replace them.

**Non-goals:** no circuit breaker, no queue, no provider failover, no new runtime dependency, no product-behavior change on the happy path. See [recruiter-assistant-plan.md](./recruiter-assistant-plan.md) for the overall architecture.

---

## Problem

Every model call goes through the Vercel AI SDK (`ai@^4.3`, `@ai-sdk/openai@^1.3`) using one `openai` provider built in [createRecruiterAssistantDependencies.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/createRecruiterAssistantDependencies.ts). Today **no call site sets `abortSignal`, an explicit `maxRetries`, a timeout, or a backoff.** The SDK's implicit `maxRetries: 2` is silently in effect but untuned, and there are **no timeouts at all** — a stalled OpenAI socket hangs until the Lambda's own timeout fires, burning the whole request budget on one wedged stage.

The pipeline ([runRecruiterAssistantPipeline.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/pipeline/runRecruiterAssistantPipeline.ts)) is a sequence of model calls. Any uncaught throw funnels into the `createDataStreamResponse` `onError` in [createRecruiterAssistantStreamResponse.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/createRecruiterAssistantStreamResponse.ts), which maps **any** failure to a single opaque `"stream_error"`.

---

## Stage inventory (as built)

| Stage                                    | Call site                                                                                                                               | SDK fn                         | Streaming?           | Current failure behavior                                                                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `intent_gate`                            | [intentGate.ts](../../services/recruiter-assistant-api/src/security/intentGate.ts)                                                      | `generateObject` (enum)        | no                   | **caught** → `intent_unclear` → HTTP 400 (pre-stream)                                                                                                                |
| `retrieval_embed`                        | [embedRetrievalQueries.ts](../../services/recruiter-assistant-api/src/retrieval/embedRetrievalQueries.ts)                               | `embedMany`                    | no                   | throws; vector-store layer has a provider fallback ([createRecruiterRetriever.ts](../../services/recruiter-assistant-api/src/retrieval/createRecruiterRetriever.ts)) |
| `evidence_evaluation`                    | [evaluateEvidence.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/agents/evidenceEvaluation/evaluateEvidence.ts)      | `streamText`                   | **yes**              | uncaught → throws                                                                                                                                                    |
| `hard_gate_extraction`                   | [assessHardGates.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/agents/hardGates/assessHardGates.ts)                 | `generateObject`               | no                   | uncaught → throws                                                                                                                                                    |
| `evidence_analysis`                      | [analyzeEvidence.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/agents/evidenceAnalysis/analyzeEvidence.ts)          | `streamText`                   | **yes**              | uncaught → throws                                                                                                                                                    |
| `interests`                              | [evaluateInterests.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/agents/interests/evaluateInterests.ts)             | `generateText`                 | no (fire-and-forget) | **caught** → `logWarn`, never user-visible                                                                                                                           |
| `chart`                                  | [projectChart.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/agents/chart/projectChart.ts)                           | `generateObject`               | no                   | **graceful** → returns `null`; already retries full→compact on truncation                                                                                            |
| `briefing_prep`                          | [projectBriefingAndChart.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/agents/recruiter/projectBriefingAndChart.ts) | `streamText`                   | **yes**              | runs in `Promise.all` with chart — a throw rejects **both**                                                                                                          |
| `pitch`                                  | [generatePitch.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/agents/pitch/generatePitch.ts)                         | `streamText`                   | **yes**              | uncaught → throws _mid-stream_                                                                                                                                       |
| `references_claims` / `references_embed` | [references.ts](../../services/recruiter-assistant-api/src/rag/references.ts)                                                           | `generateObject` + `embedMany` | no                   | **graceful** → returns `""` (no References block)                                                                                                                    |

Tracing already records a `StageRecord { stage, model, status, latencyMs, errorName, … }` per call via `traceGenerate()` (awaited) and `makeStreamTraceOnFinish()` (streams) in [requestTrace.ts](../../services/recruiter-assistant-api/src/tracing/requestTrace.ts), emits one structured pino line per request, and persists it to S3. **That is the seam the reliability layer plugs into** — extend it, don't fork it.

---

## 1 & 2. Which stages retry — and which must not

The deciding axis is **streaming + position on the critical path**, not perceived importance.

- **Non-streaming, awaited** (`intent_gate`, `retrieval_embed`, `hard_gate_extraction`, `chart`, `references_*`, `interests`): fully retryable — nothing is on the wire yet, so a retry is transparent.
- **Streaming** (`evidence_evaluation`, `evidence_analysis`, `briefing_prep`, `pitch`): retry is only safe **before the first byte reaches the client** (`mergeIntoDataStream`). After that, a replay would duplicate or garble visible output. These get _connection-establishment_ retries only (the SDK's internal `maxRetries`, which retries before consumption begins) — never a wrapper-level replay.
- **Never retried:** non-stochastic schema/validation errors, auth/quota config errors, content-policy refusals, any 4xx except 408/409/429, and **client cancellation** (see §8).

---

## 3. Timeout budgets per stage

One `AbortSignal.timeout(ms)` per stage, composed with the request cancellation signal (§8). For streams it also kills a stalled socket (no tokens for N s). All values are env-tunable constants in [constants.ts](../../services/recruiter-assistant-api/src/constants.ts) (token caps shown for sizing rationale).

| Stage                  | Max tokens  | Timeout      | Rationale                                |
| ---------------------- | ----------- | ------------ | ---------------------------------------- |
| `intent_gate`          | 24          | **8 s**      | trivial; blocks pre-stream, keep snappy  |
| `retrieval_embed`      | —           | **10 s**     | small embed batch                        |
| `evidence_evaluation`  | 1600        | **45 s**     | first large generation (stream)          |
| `hard_gate_extraction` | 2048        | **30 s**     | structured object                        |
| `evidence_analysis`    | 1024        | **40 s**     | stream                                   |
| `interests`            | 768         | **25 s**     | background, generous                     |
| `chart` (per attempt)  | 1536 / 1024 | **30 s** × 2 | two-attempt full→compact fallback exists |
| `briefing_prep`        | 220         | **12 s**     | cosmetic status line                     |
| `pitch`                | 1800        | **50 s**     | main deliverable (stream)                |
| `references_claims`    | 512         | **18 s**     |                                          |
| `references_embed`     | —           | **10 s**     |                                          |

**Budget guardrail:** the sum of the _blocking critical-path_ timeouts (intent + retrieval + evidence_eval + hard_gates + analysis + chart + pitch + references) must stay under the Lambda Function URL streaming timeout with margin. The implementation PR must document this sum and confirm the Lambda timeout exceeds it — otherwise the per-stage timeouts are cosmetic.

---

## 4. Retry policy per stage

**Backoff (shared):** full-jitter exponential — `delay = random(0, min(cap, base · 2^attempt))` with `base = 250 ms`, `cap = 2000 ms`. Honor a `Retry-After` header when the error carries one (429 / 503). **Disable the SDK's built-in retry (`maxRetries: 0`) on stages where the wrapper owns the loop**, so we don't compound to 2 × N retries and surprise the latency budget.

**Retryable:** HTTP 408, 409, 429, all 5xx; network errors (`ECONNRESET`, `ETIMEDOUT`, `EPIPE`, socket hang-up); AI SDK `APICallError` with `isRetryable === true`; our own timeout (`TimeoutError`) **only if** the stage's time budget still allows another attempt.

**Non-retryable (fail fast):** 400 / 422 (malformed request), 401 / 403 (auth / key — a config bug; retrying just burns quota), 404, content-policy refusals, Zod / `NoObjectGeneratedError` schema failures (**except** one stochastic re-roll where noted), and client cancellation.

| Stage                  | Max attempts                               | Retry mechanism     | Notes                                               |
| ---------------------- | ------------------------------------------ | ------------------- | --------------------------------------------------- |
| `intent_gate`          | 2 (1 retry)                                | wrapper loop        | cheap; pre-stream                                   |
| `retrieval_embed`      | 3 (2 retries)                              | wrapper loop        | grounding is load-bearing                           |
| `evidence_evaluation`  | 3 (SDK `maxRetries: 2`)                    | SDK, pre-token only | no wrapper replay                                   |
| `hard_gate_extraction` | 3 (2 retries)                              | wrapper loop        | + **1** re-roll on `NoObjectGenerated` (stochastic) |
| `evidence_analysis`    | 2 (SDK `maxRetries: 1`)                    | SDK, pre-token only |                                                     |
| `interests`            | 1 (no retry)                               | —                   | background; don't spend latency/cost                |
| `chart`                | 2 content-attempts × (SDK `maxRetries: 1`) | hybrid              | keep full→compact; add transient retry per attempt  |
| `briefing_prep`        | 1 (no retry)                               | —                   | cosmetic                                            |
| `pitch`                | 3 (SDK `maxRetries: 2`)                    | SDK, pre-token only | mid-stream failure is unrecoverable (see §5)        |
| `references_claims`    | 2 (1 retry)                                | wrapper loop        | + 1 stochastic re-roll allowed                      |
| `references_embed`     | 2 (1 retry)                                | wrapper loop        |                                                     |

---

## 5. Graceful degradation

Principle: **never silently drop a guardrail, never present a half-finished deliverable as complete.** Two classes: _omit-with-trace_ (optional enrichments) and _fail-closed-with-message_ (load-bearing stages).

- **Evidence evaluation fails** (after retries): load-bearing — every downstream stage consumes its markdown. **Fail closed** before any pitch byte: emit a plain user message (_"I couldn't analyze this role right now — please try again."_), set trace `outcome = error` + `errorClass`. Never fabricate an empty evaluation and continue.
- **Chart generation fails:** already graceful — `projectChart` returns `null`, the chart marker is simply not emitted. Keep exactly this; add `degraded = true` + a reliability event so the dashboard tracks a chart-drop rate. Pitch and brief are unaffected.
- **References fail:** already graceful — return `""`, no `## References` block. Keep; add the trace flag. The assessment is still shown; only the citation appendix is missing.
- **Pitch fails mid-stream:** the hard case — bytes are already on the wire, so no transparent retry. Catch in the pitch stage / stream `onError`, append a **visible inline notice** to the same stream (_"⚠ The assessment was cut off before completing."_), flush, then mark trace `outcome = error`, `degraded = true`, `stage = pitch`. Never leave the user with a silently truncated pitch that looks finished. Pre-first-token failures are retried by the SDK and never reach this path.

Also covered by the per-stage table:

- **Hard gates fail:** degrade to "mandatory-requirement check unavailable" — continue with `assessment = null` **but keep the conservative fit clamp** and inject a one-line caveat into the brief; mark `degraded`. Silently dropping the gate would _overstate_ fit, which violates "don't hide failures."
- **Evidence analysis fails:** omit the analyst brief, continue to chart + pitch on the evaluation alone; `degraded = true`.
- **Briefing prep fails:** swallow and skip (cosmetic). **Fix the `Promise.all` coupling** in [projectBriefingAndChart.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/agents/recruiter/projectBriefingAndChart.ts) so a briefing throw can't take the chart down with it — wrap each branch to degrade-to-skip independently.
- **Intent gate fails:** keep today's fail-closed `intent_unclear` → 400 (pre-stream, cheap).
- **Interests fails:** unchanged (logged, never user-visible) — already correct.

---

## 6. Reusable wrapper (minimal, no framework)

One small module — `src/reliability/withReliability.ts` (~80–100 lines) — plus a per-stage policy table. Two entry points, because awaited and streaming calls differ structurally.

```ts
// src/reliability/policy.ts — single source of truth, env-tunable
export type StagePolicy = {
  stage: string;
  timeoutMs: number;
  maxAttempts: number; // total, including the first
  retryable: boolean; // false → no wrapper retries
};
export const STAGE_POLICIES: Record<StageName, StagePolicy> = {
  /* §3 + §4 */
};

// classification — pure, unit-testable
export function classifyError(err: unknown): {
  retryable: boolean;
  errorClass:
    | "timeout"
    | "retryable"
    | "non_retryable"
    | "schema"
    | "cancelled";
};

// (A) awaited calls: generateObject / generateText / embedMany
export async function runModelStage<T>(
  policy: StagePolicy,
  kind: ModelCallKind,
  model: string,
  call: (opts: { abortSignal: AbortSignal; maxRetries: number }) => Promise<T>
): Promise<T> {
  // owns: composite AbortSignal (timeout ⊕ cancellation, §8),
  //       retry loop with full-jitter backoff,
  //       maxRetries: 0 into `call` (wrapper is the single retrier),
  //       records StageRecord + reliability event via the existing trace, then rethrows.
}

// (B) streaming calls: streamText
export function streamModelStage(
  policy: StagePolicy,
  model: string,
  start: (opts: {
    abortSignal: AbortSignal;
    maxRetries: number;
    onError;
    onFinish;
  }) => StreamResult
): StreamResult {
  // owns: composite AbortSignal (also guards a stalled stream),
  //       SDK maxRetries (pre-token retry is the only safe kind),
  //       wires onFinish → makeStreamTraceOnFinish, onError → trace reliability event.
  //       NO replay after the first byte.
}
```

Each call site changes from a bare `generateObject({ … })` to
`runModelStage(STAGE_POLICIES.x, "chat", CHAT_MODEL, ({ abortSignal, maxRetries }) => generateObject({ …, abortSignal, maxRetries }))`.
Degradation (return fallback vs. rethrow) stays at the call site — the wrapper standardizes **timeout + retry + tracing + cancellation**, not product decisions. It **subsumes** `traceGenerate` / `makeStreamTraceOnFinish` rather than duplicating them.

**Why not a circuit breaker / framework:** one OpenAI provider, single-tenant low-QPS portfolio service — a breaker has nothing to fail over to and only adds state to reason about. Per-stage timeout + bounded retry + honest degradation is the right altitude. A breaker is the documented _next_ step if QPS ever justifies it.

---

## 7. Attaching reliability events to the trace envelope

Extend `StageRecord` in [requestTrace.ts](../../services/recruiter-assistant-api/src/tracing/requestTrace.ts) with **optional** fields (backward-compatible — existing pino consumers and S3 readers keep working):

```ts
type StageRecord = {
  /* …existing… */
  attempts?: number; // total attempts the wrapper made
  retried?: boolean;
  timedOut?: boolean;
  degraded?: boolean; // produced a fallback, not full output
  errorClass?:
    | "timeout"
    | "retryable"
    | "non_retryable"
    | "schema"
    | "cancelled";
};
```

- The wrapper calls a new `RequestTrace.recordStageReliability(...)` (or folds the fields into `recordStage`), reusing the `getActiveTrace()` `AsyncLocalStorage` seam — no new plumbing through the pipeline.
- Add a request-level rollup in `toLog().totals`: `degraded: boolean`, `retriedStages: string[]`, `timedOutStages: string[]`, plus a `cancelled: boolean` and the existing `outcome` gaining a `"cancelled"` value (§8).
- These flow automatically into both the single pino line **and** the persisted S3 chat-trace via `saveChatTrace`, already invoked in the `finally` of [createRecruiterAssistantStreamResponse.ts](../../services/recruiter-assistant-api/src/recruiterAssistant/createRecruiterAssistantStreamResponse.ts).
- The generic `"stream_error"` `onError` should additionally carry the failing stage + `errorClass` into the trace, so a degraded-but-200 response stays queryable.

Result: existing dashboards/evals gain retry-rate, timeout-rate, degradation-rate, and cancellation-rate per stage with **no new transport**.

---

## 8. Request cancellation (backend-ready; frontend pending)

**The frontend has no interrupt/stop control yet. The backend should support cancellation now anyway** — and it pays off immediately even without a stop button, because a browser that closes the connection (tab closed, navigation away, refresh) is itself a client disconnect we should honor to stop token billing on work nobody will read.

Design:

- Introduce a request-scoped `AbortController` ("cancellation") created in the handler, threaded into `RecruiterPipelineParams` (or stored beside the trace in `AsyncLocalStorage`). Its `signal` defaults to never-aborted.
- The wrapper composes it with the per-stage timeout: `AbortSignal.any([AbortSignal.timeout(stage.timeoutMs), cancellation.signal])` (Node ≥ 20.3, which the service targets). The composite is passed as `abortSignal` to every model call, so an abort propagates to in-flight OpenAI requests and streams.
- **Producers** of the cancellation signal:
  - _Available now:_ client disconnect on the Lambda Function URL response stream — wire the request/stream close event to `cancellation.abort("client_cancelled")`.
  - _Frontend pending:_ an explicit user "stop" action (and, later, a possible `POST /interrupt` or in-band stop marker). The backend contract is ready; only the producer is missing on the client.
- **Distinguish cancellation from failure.** `AbortSignal.timeout` raises a `TimeoutError`; cancellation aborts with reason `"client_cancelled"`. `classifyError` maps cancellation to `errorClass: "cancelled"` — **not retryable, not degraded, not an error toast.** The trace records `outcome: "cancelled"`; reliability error/timeout metrics must exclude it so cancellations don't pollute the failure rate.
- No user-facing error on cancellation: the user asked to stop (or left). Just close the stream cleanly and record the cancellation.

This keeps the reliability primitive (composite `AbortSignal`) and the cancellation feature as one mechanism, so adding the frontend stop button later is a client-only change.

---

## 9. Acceptance criteria for the implementation PR

1. **Every model call site** (all 11 stages) routes through `runModelStage` / `streamModelStage`; no bare `generateObject` / `generateText` / `streamText` / `embedMany` with an unbounded request remains (enforced by a grep test or lint rule).
2. Each stage has an explicit, env-tunable **timeout** and **retry policy** matching §3–§4; defaults centralized in one policy table.
3. **No double-retry:** wrapper-owned-loop stages set SDK `maxRetries: 0`; SDK-retry stages don't also loop.
4. `classifyError` is **unit-tested** for each case: 429, 5xx, `ECONNRESET`, `TimeoutError`, 401, 400, Zod/`NoObjectGenerated`, and `"client_cancelled"`.
5. **Degradation tests:** evidence-eval failure → fail-closed with user message + `outcome = error`; chart / references / analysis failure → output omitted, request still 200, `degraded = true`; pitch mid-stream failure → visible truncation notice + trace flagged; hard-gate failure → caveat injected, fit not overstated.
6. The **`Promise.all` coupling** in `projectBriefingAndChart` is decoupled so briefing failure cannot kill the chart (regression test).
7. **Cancellation tests:** an abort mid-pipeline aborts in-flight calls, closes the stream cleanly, records `outcome = "cancelled"` with `errorClass: "cancelled"`, triggers **no** retry and **no** user-facing error, and is **excluded** from failure/timeout metrics.
8. Trace envelope carries the new optional reliability fields + request-level rollup; a golden-trace test asserts shape and backward compatibility; S3 persistence verified to include them.
9. **Timeout-budget doc:** the PR states the summed critical-path budget and confirms the Lambda streaming timeout exceeds it.
10. No happy-path behavior change — existing eval suites (retrieval, snapshot, e2e) and unit tests pass unchanged; a fault-injection harness (mock provider that throws / stalls / aborts) exercises each retry, timeout, degradation, and cancellation path.
11. No new runtime dependency (`package.json` diff is wrapper code only).

---

## Constraints honored

- **No heavy framework** — a wrapper plus a policy table.
- **No happy-path behavior change** — covered by criterion 10.
- **Failures are never hidden** — trace flags + visible inline notices; cancellation is recorded, not swallowed.
- **User-facing failures stay understandable** — plain retry/truncation messages, no stack traces or codes.
- **Portfolio-suitable, production-credible** — small surface, but the retry/timeout/degradation/cancellation taxonomy is the real production conversation.
