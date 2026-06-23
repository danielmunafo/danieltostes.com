import { describe, expect, it } from "vitest";
import { RequestTrace } from "../src/tracing/requestTrace.js";

function newTrace(): RequestTrace {
  return new RequestTrace("req-1", { navLocale: "en", nowMs: 0 });
}

// ---------------------------------------------------------------------------
// Reliability rollup fields in toLog()
// ---------------------------------------------------------------------------

describe("RequestTrace reliability rollup", () => {
  it("reports degraded: false and empty arrays when no degradation occurred", () => {
    const trace = newTrace();
    trace.recordStage({
      stage: "pitch",
      model: "gpt-4",
      kind: "chat",
      status: "success",
      latencyMs: 100,
    });
    trace.setOutcome("success");
    const { totals } = trace.toLog();
    expect(totals).toMatchObject({
      degraded: false,
      cancelled: false,
      degradedStages: [],
      retriedStages: [],
      timedOutStages: [],
    });
  });

  it("reports degraded: true and degradedStages when recordDegradation is called", () => {
    const trace = newTrace();
    trace.recordDegradation("pitch");
    trace.setOutcome("success");
    const { totals } = trace.toLog();
    expect(totals.degraded).toBe(true);
    expect(totals.degradedStages).toContain("pitch");
  });

  it("accumulates multiple degraded stages", () => {
    const trace = newTrace();
    trace.recordDegradation("evidence_analysis");
    trace.recordDegradation("references_claims");
    const { totals } = trace.toLog();
    expect(totals.degradedStages).toEqual(
      expect.arrayContaining(["evidence_analysis", "references_claims"])
    );
  });

  it("reports retriedStages for stages with retried: true", () => {
    const trace = newTrace();
    trace.recordStage({
      stage: "hard_gates",
      model: "gpt-4",
      kind: "chat",
      status: "success",
      latencyMs: 200,
      attempts: 2,
      retried: true,
    });
    const { totals } = trace.toLog();
    expect(totals.retriedStages).toContain("hard_gates");
  });

  it("does not include non-retried stages in retriedStages", () => {
    const trace = newTrace();
    trace.recordStage({
      stage: "pitch",
      model: "gpt-4",
      kind: "chat",
      status: "success",
      latencyMs: 100,
      attempts: 1,
      retried: false,
    });
    const { totals } = trace.toLog();
    expect(totals.retriedStages).toHaveLength(0);
  });

  it("reports timedOutStages for stages with timedOut: true", () => {
    const trace = newTrace();
    trace.recordStage({
      stage: "chart",
      model: "gpt-4",
      kind: "chat",
      status: "error",
      latencyMs: 30_001,
      timedOut: true,
      errorClass: "timeout",
    });
    const { totals } = trace.toLog();
    expect(totals.timedOutStages).toContain("chart");
  });

  it("reports cancelled: true when outcome is cancelled", () => {
    const trace = newTrace();
    trace.setOutcome("cancelled");
    const { totals } = trace.toLog();
    expect(totals.cancelled).toBe(true);
  });

  it("reports cancelled: false for non-cancelled outcomes", () => {
    const trace = newTrace();
    trace.setOutcome("success");
    expect(trace.toLog().totals.cancelled).toBe(false);

    const trace2 = newTrace();
    trace2.setOutcome("error");
    expect(trace2.toLog().totals.cancelled).toBe(false);
  });

  it("preserves errorClass in the stage record", () => {
    const trace = newTrace();
    trace.recordStage({
      stage: "intent_gate",
      model: "gpt-4",
      kind: "chat",
      status: "error",
      latencyMs: 50,
      errorClass: "schema",
      errorName: "ZodError",
    });
    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages[0]).toMatchObject({
      errorClass: "schema",
      errorName: "ZodError",
    });
  });
});
