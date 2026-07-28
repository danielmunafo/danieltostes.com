# Recruiter assistant maintainability assessment

**Status:** Current repo-state assessment for recruiter-assistant AI production
readiness and maintainability.
**Verified baseline:** `origin/main` at `2e032379d2c82279257a8b51fd0a02643af16683`
(`v0.17.0`) on 2026-06-29.
**Scope:** Documentation-only analysis. No runtime, prompt, eval threshold, or
AWS resource changes are included.

This file intentionally distinguishes verified current repository state from
historical roadmap context. PR #56
(`docs(recruiter-assistant): add ops readiness roadmap`) was a closed draft,
was not merged, and its planned file
`docs/plans/recruiter-assistant-production-readiness-roadmap.md` is absent from
current `main`. The PR #56 content is useful historical context only; the
assessment below is rebaselined against the current tree.

This plan is not added to `docs/README.md` or `docs/plans/README.md` in this PR
because the delegated work required exactly one documentation file.

## Current-state evidence

| Area                              | Verified current state                                                                                                                                                                                                                                                                                             | Evidence in current tree                                                                                                                                                                                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request tracing                   | Chat requests have a request trace with outcome, latency, retrieval stats, stage records, token usage, estimated cost, and prompt metadata when the stage maps to the prompt registry. Late records are ignored after finish.                                                                                      | `services/recruiter-assistant-api/src/tracing/requestTrace.ts`, `services/recruiter-assistant-api/src/tracing/requestTraceMetrics.ts`                                                                                                                                                                                                                 |
| Feedback-to-trace correlation     | The backend writes a request trace annotation into the AI data stream, the client extracts that backend request id for feedback, and feedback/chat traces are saved with matching `requestId` values.                                                                                                              | `services/recruiter-assistant-api/src/recruiterAssistant/createRecruiterAssistantStreamResponse.ts`, `services/recruiter-assistant-api/src/recruiterAssistant/stream/requestTraceAnnotation.ts`, `src/features/recruiter-assistant/lib/recruiter-assistant-trace-annotation.ts`, `services/recruiter-assistant-api/src/feedback/writeFeedbackToS3.ts` |
| Prompt lifecycle                  | Prompt ids, versions, owners, source files, stages, and update dates are explicit. The committed manifest hashes current prompt text and the version-bump check compares it with `origin/main`.                                                                                                                    | `services/recruiter-assistant-api/src/recruiterAssistant/prompt/promptRegistry.ts`, `services/recruiter-assistant-api/prompts.manifest.json`, `services/recruiter-assistant-api/scripts/check-prompt-version-bump.mjs`, `services/recruiter-assistant-api/docs/prompt-registry.md`, `services/recruiter-assistant-api/tests/promptManifest.test.ts`   |
| Awaited model reliability         | Awaited model and embedding calls have timeout, retry, backoff, retry classification, parent `AbortSignal` support, and tests.                                                                                                                                                                                     | `services/recruiter-assistant-api/src/reliability/modelCallReliability.ts`, `services/recruiter-assistant-api/tests/modelCallReliability.test.ts`                                                                                                                                                                                                     |
| Streamed stage reliability        | `streamText` calls now run through a request/stage abort scope with default request and stage budgets, zero SDK retries, trace recording for success/error, usage extraction on finish, and timeout/error tests. The pipeline threads `streamSignal` through evaluator, analyst, briefing/chart, and pitch stages. | `services/recruiter-assistant-api/src/reliability/streamTextReliability.ts`, `services/recruiter-assistant-api/src/recruiterAssistant/pipeline/runRecruiterAssistantPipeline.ts`, `services/recruiter-assistant-api/tests/streamTextReliability.test.ts`                                                                                              |
| Rejected request visibility       | Intent-gate rejections are finalized, logged, and saved as traces instead of disappearing before the main pipeline starts.                                                                                                                                                                                         | `services/recruiter-assistant-api/tests/handlerRejectedTrace.test.ts`, `services/recruiter-assistant-api/src/recruiterAssistant/request/parseAndValidateRecruiterRequest.ts`                                                                                                                                                                          |
| Retrieval and deterministic evals | Retrieval evals are CI-gated for trusted service changes, and hard-gate/reference behavior has fixture-backed Vitest coverage. Golden retrieval tests cover key corpus behavior.                                                                                                                                   | `.github/workflows/recruiter-api.yml`, `evals/retrieval/cases.json`, `evals/hard-gates/cases.json`, `evals/references/cases.json`, `services/recruiter-assistant-api/tests/evalFixtures.test.ts`, `services/recruiter-assistant-api/tests/goldenRetrieval.test.ts`                                                                                    |
| E2E eval scorecards               | The E2E eval runner supports priority-case selection, case filtering, prompt-version stamps, git SHA capture, and optional JSON scorecard output. Helper tests cover scorecard shape and failure summaries.                                                                                                        | `services/recruiter-assistant-api/scripts/eval-e2e.mjs`, `services/recruiter-assistant-api/scripts/lib/eval-scorecard.mjs`, `services/recruiter-assistant-api/tests/evalScorecard.test.ts`                                                                                                                                                            |
| CloudWatch operations             | Request/stage/feedback EMF metrics exist, and the repo includes a generator plus runbook for dashboard widgets and alarms covering errors, latency, missing usage/cost, retrieval degradation, and negative feedback.                                                                                              | `services/recruiter-assistant-api/src/tracing/requestTraceMetrics.ts`, `services/recruiter-assistant-api/scripts/render-cloudwatch-ops.mjs`, `services/recruiter-assistant-api/docs/cloudwatch-operations.md`, `services/recruiter-assistant-api/SETUP.md`                                                                                            |
| Feedback review loop              | Offline review tooling joins negative feedback with traces by `requestId`, redacts raw question/response text by default, can emit eval-candidate JSON, and is documented as an offline workflow.                                                                                                                  | `services/recruiter-assistant-api/scripts/feedback-review-queue.mjs`, `services/recruiter-assistant-api/scripts/lib/feedback-review-queue.mjs`, `services/recruiter-assistant-api/docs/feedback-review-to-eval.md`, `services/recruiter-assistant-api/tests/feedbackReviewQueue.test.ts`                                                              |
| Public disclosure                 | Feedback storage behavior is disclosed in public terms across locales and setup docs describe the feedback bucket, trace object layout, and correlation path.                                                                                                                                                      | `public/content/recruiter-assistant/terms/*.md`, `services/recruiter-assistant-api/SETUP.md`, `docs/plans/recruiter-assistant-plan.md`                                                                                                                                                                                                                |

## Maintainability rating

**Rating: 4 / 5 - maintainable for owner-operated production, not yet a mature
team-operated service.**

Scale:

- **1:** Fragile. Failures are opaque and changes rely mostly on manual memory.
- **2:** Debuggable by the original author, but operations and evals are ad hoc.
- **3:** Maintainable beta. Core traces/tests exist, but production ownership is
  mostly manual.
- **4:** Owner-operated production. Traceability, evals, reliability controls,
  feedback review, and ops runbooks are present enough for disciplined
  iteration.
- **5:** Mature service. Release quality, privacy posture, incident response,
  scorecard history, and live operational controls are routinely enforced and
  reviewable by someone other than the original implementer.

The current system earns **4 / 5** because the biggest AI production-readiness
risks from the stale roadmap have been addressed in code or docs: request
traces, feedback correlation, prompt versioning, prompt-manifest integrity,
retrieval gates, deterministic fixtures, E2E scorecard support, awaited and
streamed reliability wrappers, CloudWatch operations artifacts, and an offline
feedback-review workflow.

It is not a 5 because several controls are still evidence-light or manual:
dashboard/alarm installation is documented but not verified in this repo,
scorecard history is supported but not visibly retained as a routine release
artifact, feedback and trace retention/access/deletion policy is not yet
specific enough, and feedback-derived eval promotion still depends on manual
discipline.

## Remaining risks

| Risk                                                             | Why it still matters                                                                                                                                                                                                          | Current mitigation                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Live ops install drift                                           | The repo can generate CloudWatch dashboards and alarms, but this assessment did not verify that production AWS has the latest generated artifacts installed or tuned after real traffic.                                      | Generator, setup section, and CloudWatch runbook are committed.                   |
| Scorecard history is optional                                    | `eval:e2e --json-out` can write a machine-readable scorecard, but CI does not show a durable history/comparison policy for E2E results across releases.                                                                       | Retrieval eval is CI-gated; E2E scorecard helper exists.                          |
| Privacy posture remains policy-light                             | Feedback records still accept raw `questionText` and `responseText`; review output redacts text by default, but retention windows, bucket access review, deletion process, and lifecycle enforcement are not fully specified. | Public terms disclose review storage; feedback-review tooling redacts by default. |
| Feedback-to-eval cadence is manual                               | Negative feedback can be joined with traces and converted into eval candidates, but there is no required cadence or status ledger for promoted/ignored feedback.                                                              | Offline queue and review-to-eval docs exist.                                      |
| Stream abort behavior is unit-tested, not end-to-end proven here | Stream wrappers have focused tests, but this assessment did not run a browser/Lambda-style disconnect test through the full response-streaming surface.                                                                       | `streamTextReliability` and pipeline `streamSignal` wiring exist.                 |
| Cost and model drift still require active review                 | Metrics can reveal missing usage/cost and the prompt registry exposes prompt versions, but model price updates, model overrides, and cost thresholds still need operational review.                                           | Cost estimator, missing cost metrics, and CloudWatch alarm defaults exist.        |

## Stale roadmap deltas

The PR #56 roadmap listed several next slices that are no longer open in the
same form:

- **Streaming/request cancellation reliability:** implemented materially in
  `streamTextReliability.ts` and threaded through the pipeline. Remaining work is
  integration proof and operational tuning, not first implementation.
- **CloudWatch dashboard, alarms, and runbook:** implemented as generator docs
  and scripts. Remaining work is deployment verification and threshold tuning.
- **Eval scorecards/history:** scorecard generation exists for E2E evals.
  Remaining work is durable artifact retention and release comparison policy.
- **Feedback review-to-eval loop:** offline queue and docs exist. Remaining work
  is cadence, ownership, and promoted-fixture bookkeeping.
- **Privacy/retention posture:** still the least complete lane. Disclosure exists,
  but operational retention, deletion, and access controls need sharper policy
  and evidence.

## Suggested PR-sized follow-up lanes

1. **`docs/recruiter-ops-verification` - prove live ops installation**
   - Install or refresh the generated production/dev CloudWatch dashboard and
     alarms.
   - Record the exact generation command, dashboard name, alarm names, target
     environment, and first-pass threshold rationale.
   - Add a short verification note or runbook appendix that distinguishes
     "artifact generated" from "artifact installed."

2. **`ci/recruiter-eval-scorecard-history` - persist scorecards**
   - Add CI artifact upload for `eval:e2e --priority --json-out ...` where
     secrets and runtime availability permit it.
   - Capture commit SHA, prompt versions, model id, corpus hash when available,
     selected case ids, pass/fail/error counts, and deterministic failures.
   - Define which scorecard failures block, which warn, and how reviewers compare
     the latest run with the prior release.

3. **`docs/recruiter-data-retention-policy` - close privacy operations**
   - Define retention windows for CloudWatch logs, feedback records, chat traces,
     exported review files, and eval artifacts.
   - Document bucket access, access review cadence, deletion by `requestId` or
     session id, lifecycle rules, and whether raw question/response text should
     remain in long-term feedback records.
   - Keep public terms aligned with the final policy.

4. **`test/recruiter-feedback-derived-fixtures` - turn review findings into evals**
   - Use the feedback review queue on a local export and select a small number of
     sanitized, non-sensitive regression cases.
   - Add the cases to the narrowest eval surface: retrieval, hard gates,
     references, or E2E.
   - Include a lightweight ledger entry for converted, ignored, and needs-product
     feedback so the loop is auditable.

5. **`test/recruiter-stream-abort-integration` - verify full response-stream aborts**
   - Add an integration-style test or harness that exercises client disconnect or
     request-budget timeout through the data-stream response path.
   - Assert downstream AI work is stopped, traces show the right outcome, and the
     saved trace does not look like a clean success.
   - Keep prompt text unchanged; this is reliability coverage only.

6. **`chore/recruiter-cost-budget-guardrails` - make cost drift reviewable**
   - Add a small documented process for checking `EstimatedCostUSD`,
     `CostMissingCallCount`, and model overrides after deploys.
   - Verify the estimator knows the active configured model before changing
     `RECRUITER_CHAT_MODEL`.
   - Consider a conservative monthly-budget or per-request-cost alarm once real
     traffic baseline exists.

## Recommended order

1. Ops verification.
2. Scorecard history.
3. Data retention policy.
4. Feedback-derived fixtures.
5. Stream abort integration.
6. Cost budget guardrails.

This order first proves the production control plane, then makes quality trends
reviewable, then tightens privacy and closes the feedback loop. The lanes are
small enough to publish as separate PRs and avoid mixing runtime reliability,
CI/eval policy, and privacy docs in one branch.

## Validation notes for this assessment

This assessment is based on local repository and GitHub metadata checks, not
live AWS, OpenAI, or production-browser traffic. It verifies that the current
tree contains the documented implementation surfaces; it does not verify that
AWS dashboards, alarms, lifecycle rules, or feedback buckets are currently
installed with production values.
