/**
 * Per-stage reliability policy: timeout budget, retry attempts, and which
 * component owns the retry loop. One source of truth for every model call.
 *
 * Timeouts are env-tunable (`RECRUITER_<STAGE>_TIMEOUT_MS`); attempt counts are
 * fixed in code. Stage names match the trace `stage` strings recorded in
 * `requestTrace.ts`, so reliability events line up with existing trace stages.
 */

export type StageName =
  | "intent_gate"
  | "retrieval_embed"
  | "evidence_evaluation"
  | "hard_gates"
  | "evidence_analysis"
  | "interests"
  | "chart"
  | "briefing_prep"
  | "pitch"
  | "references_claims"
  | "references_embed";

/**
 * `wrapper`: awaited calls (`generateObject` / `generateText` / `embedMany`) —
 * the wrapper owns the retry loop and tells the SDK `maxRetries: 0`.
 * `sdk`: streaming calls (`streamText`) — only the SDK's pre-first-token retry
 * is safe (a replay after bytes are on the wire would duplicate output), so the
 * attempt count maps to the SDK `maxRetries` and the wrapper never replays.
 */
export type RetryMechanism = "wrapper" | "sdk";

export type StagePolicy = {
  readonly stage: StageName;
  /** Hard wall-clock cap for the stage; also aborts a stalled stream. */
  readonly timeoutMs: number;
  /** Total attempts including the first. 1 = no retries. */
  readonly maxAttempts: number;
  readonly mechanism: RetryMechanism;
};

function envTimeoutMs(stage: StageName, fallbackMs: number): number {
  const raw = process.env[`RECRUITER_${stage.toUpperCase()}_TIMEOUT_MS`];
  if (!raw) return fallbackMs;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
}

function policy(
  stage: StageName,
  fallbackTimeoutMs: number,
  maxAttempts: number,
  mechanism: RetryMechanism
): StagePolicy {
  return {
    stage,
    timeoutMs: envTimeoutMs(stage, fallbackTimeoutMs),
    maxAttempts,
    mechanism,
  };
}

/**
 * Default budgets (see docs/plans/reliability-layer-plan.md §3–§4). The summed
 * critical-path timeout must stay under the Lambda Function URL streaming
 * timeout — verify when tuning these.
 */
export const STAGE_POLICIES: Record<StageName, StagePolicy> = {
  intent_gate: policy("intent_gate", 8_000, 2, "wrapper"),
  retrieval_embed: policy("retrieval_embed", 10_000, 3, "wrapper"),
  evidence_evaluation: policy("evidence_evaluation", 45_000, 3, "sdk"),
  hard_gates: policy("hard_gates", 30_000, 3, "wrapper"),
  evidence_analysis: policy("evidence_analysis", 40_000, 2, "sdk"),
  interests: policy("interests", 25_000, 1, "wrapper"),
  // Two content attempts (full → compact) live in projectChart; the wrapper adds
  // a small transient-error retry per attempt.
  chart: policy("chart", 30_000, 2, "wrapper"),
  briefing_prep: policy("briefing_prep", 12_000, 1, "sdk"),
  pitch: policy("pitch", 50_000, 3, "sdk"),
  references_claims: policy("references_claims", 18_000, 2, "wrapper"),
  references_embed: policy("references_embed", 10_000, 2, "wrapper"),
};
