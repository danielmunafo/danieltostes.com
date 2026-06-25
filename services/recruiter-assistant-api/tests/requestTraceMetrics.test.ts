import { describe, expect, it } from "vitest";
import {
  buildRequestTraceMetricEnvelopes,
  readRecruiterMetricsEnvironment,
} from "../src/tracing/requestTraceMetrics.js";
import type { RequestTraceLogEnvelope } from "../src/tracing/requestTrace.js";

type MetricPayloadForTest = {
  _aws: {
    CloudWatchMetrics: Array<{ Metrics: Array<{ Name: string }> }>;
  };
};

function metricNames(payload: MetricPayloadForTest): string[] {
  return (
    payload._aws.CloudWatchMetrics[0]?.Metrics.map((metric) => metric.Name) ??
    []
  );
}

describe("buildRequestTraceMetricEnvelopes", () => {
  it("builds request and stage EMF payloads from the trace log envelope", () => {
    const traceLog = {
      requestId: "req-secret-123",
      navLocale: "pt-BR",
      outcome: "success",
      totalLatencyMs: 2500,
      retrieval: {
        provider: "llamaindex-native",
        topK: 30,
        returnedChunks: 28,
        similarityMin: 0.31,
        similarityMax: 0.74,
        latencyMs: 180,
      },
      stages: [
        {
          stage: "pitch",
          model: "gpt-4.1-nano",
          status: "success",
          latencyMs: 120,
          promptTokens: 100,
          completionTokens: 25,
          costUSD: 0.000123,
        },
        {
          stage: "retrieval_embed",
          model: "text-embedding-3-small",
          status: "error",
          latencyMs: 30,
          tokens: 10,
          errorName: "ProviderError",
        },
      ],
      totals: {
        llmCalls: 2,
        usageKnownCalls: 2,
        usageMissingCalls: 0,
        costKnownCalls: 2,
        costMissingCalls: 0,
        tokenUsageComplete: true,
        costEstimateComplete: true,
        promptTokens: 100,
        completionTokens: 25,
        embeddingTokens: 10,
        totalTokens: 135,
        estimatedCostUSD: 0.000124,
      },
      fullUserText: "do not copy this job description text",
    } as RequestTraceLogEnvelope & { fullUserText: string };

    const payloads = buildRequestTraceMetricEnvelopes(traceLog, {
      environment: "dev",
      timestampMs: 123456,
    });

    expect(payloads).toHaveLength(3);
    const [requestPayload, pitchPayload, retrievalPayload] = payloads;

    expect(requestPayload).toMatchObject({
      _aws: {
        Timestamp: 123456,
        CloudWatchMetrics: [
          {
            Namespace: "DanielTostes/RecruiterAssistant",
            Dimensions: [["service", "environment", "navLocale", "outcome"]],
          },
        ],
      },
      service: "recruiter-api",
      environment: "dev",
      navLocale: "pt-BR",
      outcome: "success",
      metricType: "request",
      retrievalProvider: "llamaindex-native",
      RequestCount: 1,
      RequestErrorCount: 0,
      RequestLatencyMs: 2500,
      LlmCallCount: 2,
      UsageKnownCallCount: 2,
      UsageMissingCallCount: 0,
      CostKnownCallCount: 2,
      CostMissingCallCount: 0,
      PromptTokens: 100,
      CompletionTokens: 25,
      EmbeddingTokens: 10,
      TotalTokens: 135,
      EstimatedCostUSD: 0.000124,
      RetrievalLatencyMs: 180,
      RetrievalTopK: 30,
      RetrievalReturnedChunks: 28,
      RetrievalSimilarityMin: 0.31,
      RetrievalSimilarityMax: 0.74,
    });
    expect(metricNames(requestPayload)).toEqual(
      expect.arrayContaining([
        "RequestCount",
        "RequestErrorCount",
        "RequestLatencyMs",
        "UsageMissingCallCount",
        "CostMissingCallCount",
        "TotalTokens",
        "EstimatedCostUSD",
        "RetrievalLatencyMs",
      ])
    );

    expect(pitchPayload).toMatchObject({
      _aws: {
        CloudWatchMetrics: [
          {
            Dimensions: [
              ["service", "environment", "navLocale", "stage", "outcome"],
            ],
          },
        ],
      },
      service: "recruiter-api",
      environment: "dev",
      navLocale: "pt-BR",
      stage: "pitch",
      outcome: "success",
      metricType: "stage",
      StageCallCount: 1,
      StageErrorCount: 0,
      StageLatencyMs: 120,
      StagePromptTokens: 100,
      StageCompletionTokens: 25,
      StageTotalTokens: 125,
      StageEstimatedCostUSD: 0.000123,
    });

    expect(retrievalPayload).toMatchObject({
      stage: "retrieval_embed",
      outcome: "error",
      metricType: "stage",
      StageCallCount: 1,
      StageErrorCount: 1,
      StageLatencyMs: 30,
      StageEmbeddingTokens: 10,
      StageTotalTokens: 10,
    });

    const serializedPayloads = JSON.stringify(payloads);
    expect(serializedPayloads).not.toContain("req-secret-123");
    expect(serializedPayloads).not.toContain("do not copy");
    expect(serializedPayloads).not.toContain("ProviderError");
  });

  it("omits cost metrics when the trace has no cost estimate", () => {
    const traceLog: RequestTraceLogEnvelope = {
      requestId: "req-1",
      navLocale: "en",
      outcome: "success",
      totalLatencyMs: 100,
      retrieval: null,
      stages: [
        {
          stage: "pitch",
          model: "unknown-model",
          status: "success",
          latencyMs: 50,
          promptTokens: 10,
          completionTokens: 5,
        },
      ],
      totals: {
        llmCalls: 1,
        usageKnownCalls: 1,
        usageMissingCalls: 0,
        costKnownCalls: 0,
        costMissingCalls: 1,
        tokenUsageComplete: true,
        costEstimateComplete: false,
        promptTokens: 10,
        completionTokens: 5,
        embeddingTokens: 0,
        totalTokens: 15,
        estimatedCostUSD: null,
      },
    };

    const [requestPayload, stagePayload] = buildRequestTraceMetricEnvelopes(
      traceLog,
      { environment: "dev", timestampMs: 1 }
    );

    expect(requestPayload.EstimatedCostUSD).toBeUndefined();
    expect(requestPayload.CostKnownCallCount).toBe(0);
    expect(requestPayload.CostMissingCallCount).toBe(1);
    expect(stagePayload.StageEstimatedCostUSD).toBeUndefined();
    expect(metricNames(requestPayload)).not.toContain("EstimatedCostUSD");
    expect(metricNames(stagePayload)).not.toContain("StageEstimatedCostUSD");
  });

  it("emits missing usage and cost counters for partial request totals", () => {
    const traceLog: RequestTraceLogEnvelope = {
      requestId: "req-1",
      navLocale: "en",
      outcome: "success",
      totalLatencyMs: 100,
      retrieval: null,
      stages: [
        {
          stage: "pitch",
          model: "gpt-4.1-nano",
          status: "success",
          latencyMs: 50,
        },
      ],
      totals: {
        llmCalls: 1,
        usageKnownCalls: 0,
        usageMissingCalls: 1,
        costKnownCalls: 0,
        costMissingCalls: 1,
        tokenUsageComplete: false,
        costEstimateComplete: false,
        promptTokens: 0,
        completionTokens: 0,
        embeddingTokens: 0,
        totalTokens: 0,
        estimatedCostUSD: null,
      },
    };

    const [requestPayload, stagePayload] = buildRequestTraceMetricEnvelopes(
      traceLog,
      { environment: "dev", timestampMs: 1 }
    );

    expect(requestPayload).toMatchObject({
      UsageKnownCallCount: 0,
      UsageMissingCallCount: 1,
      CostKnownCallCount: 0,
      CostMissingCallCount: 1,
      TotalTokens: 0,
    });
    expect(requestPayload.EstimatedCostUSD).toBeUndefined();
    expect(stagePayload.StageEstimatedCostUSD).toBeUndefined();
    expect(stagePayload.StageTotalTokens).toBeUndefined();
  });
});

describe("readRecruiterMetricsEnvironment", () => {
  it("uses explicit metrics environment before lambda-name inference", () => {
    const previousEnvironment = process.env.RECRUITER_METRICS_ENVIRONMENT;
    const previousFunctionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
    process.env.RECRUITER_METRICS_ENVIRONMENT = "dev";
    process.env.AWS_LAMBDA_FUNCTION_NAME = "recruiter-assistant-api";
    try {
      expect(readRecruiterMetricsEnvironment()).toBe("dev");
    } finally {
      if (previousEnvironment === undefined) {
        delete process.env.RECRUITER_METRICS_ENVIRONMENT;
      } else {
        process.env.RECRUITER_METRICS_ENVIRONMENT = previousEnvironment;
      }
      if (previousFunctionName === undefined) {
        delete process.env.AWS_LAMBDA_FUNCTION_NAME;
      } else {
        process.env.AWS_LAMBDA_FUNCTION_NAME = previousFunctionName;
      }
    }
  });
});
