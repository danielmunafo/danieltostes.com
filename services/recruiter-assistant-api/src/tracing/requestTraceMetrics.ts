import { RECRUITER_NAV_LOCALES } from "../constants.js";
import { logInfo } from "../logging/logger.js";
import type { RequestTraceLogEnvelope, StageRecord } from "./requestTrace.js";

const METRICS_NAMESPACE = "DanielTostes/RecruiterAssistant";
const METRICS_SCOPE = "recruiter.metrics";
const METRICS_MESSAGE = "request trace metrics";
const SERVICE_DIMENSION_VALUE = "recruiter-api";
const METRICS_ENVIRONMENT_ENV_VAR = "RECRUITER_METRICS_ENVIRONMENT";

const UNKNOWN_DIMENSION_VALUE = "unknown";
const LOCAL_METRICS_ENVIRONMENT = "local";
const DEV_METRICS_ENVIRONMENT = "dev";
const PRODUCTION_METRICS_ENVIRONMENT = "production";
const DEV_LAMBDA_FUNCTION_SUFFIX = "-dev";
const MAX_DIMENSION_VALUE_LENGTH = 128;

const REQUEST_METRIC_TYPE = "request";
const STAGE_METRIC_TYPE = "stage";

const REQUEST_DIMENSION_SET = [
  "service",
  "environment",
  "navLocale",
  "outcome",
] as const;
const STAGE_DIMENSION_SET = [
  "service",
  "environment",
  "navLocale",
  "stage",
  "outcome",
] as const;

const METRIC_UNITS = {
  RequestCount: "Count",
  RequestErrorCount: "Count",
  RequestLatencyMs: "Milliseconds",
  LlmCallCount: "Count",
  UsageKnownCallCount: "Count",
  UsageMissingCallCount: "Count",
  CostKnownCallCount: "Count",
  CostMissingCallCount: "Count",
  PromptTokens: "Count",
  CompletionTokens: "Count",
  EmbeddingTokens: "Count",
  TotalTokens: "Count",
  EstimatedCostUSD: "None",
  RetrievalLatencyMs: "Milliseconds",
  RetrievalTopK: "Count",
  RetrievalReturnedChunks: "Count",
  RetrievalSimilarityMin: "None",
  RetrievalSimilarityMax: "None",
  StageCallCount: "Count",
  StageErrorCount: "Count",
  StageLatencyMs: "Milliseconds",
  StagePromptTokens: "Count",
  StageCompletionTokens: "Count",
  StageEmbeddingTokens: "Count",
  StageTotalTokens: "Count",
  StageEstimatedCostUSD: "None",
} as const;

const REQUEST_OUTCOMES = ["success", "error", "unknown"] as const;
const DIMENSION_UNSAFE_CHARACTER_REGEX = /[^A-Za-z0-9_.:/+=@-]+/g;
const REPEATED_DASH_REGEX = /-+/g;
const EDGE_DASH_REGEX = /^-|-$/g;

type MetricName = keyof typeof METRIC_UNITS;
type MetricUnit = (typeof METRIC_UNITS)[MetricName];
type RequestOutcomeDimension = (typeof REQUEST_OUTCOMES)[number];

type EmfMetricDefinition = {
  Name: MetricName;
  Unit: MetricUnit;
};

type EmfMetricDirective = {
  Namespace: typeof METRICS_NAMESPACE;
  Dimensions: readonly (readonly string[])[];
  Metrics: EmfMetricDefinition[];
};

export type RequestTraceMetricPayload = Record<string, unknown> & {
  _aws: {
    Timestamp: number;
    CloudWatchMetrics: EmfMetricDirective[];
  };
  service: typeof SERVICE_DIMENSION_VALUE;
  environment: string;
  navLocale: string;
  outcome: RequestOutcomeDimension;
  metricType: typeof REQUEST_METRIC_TYPE | typeof STAGE_METRIC_TYPE;
};

export type RequestTraceMetricOptions = {
  environment?: string;
  timestampMs?: number;
};

function safeDimensionValue(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value
    .trim()
    .replace(DIMENSION_UNSAFE_CHARACTER_REGEX, "-")
    .replace(REPEATED_DASH_REGEX, "-")
    .replace(EDGE_DASH_REGEX, "")
    .slice(0, MAX_DIMENSION_VALUE_LENGTH);
  return normalized || fallback;
}

function readConfiguredMetricsEnvironment(): string | null {
  return process.env[METRICS_ENVIRONMENT_ENV_VAR]?.trim() || null;
}

export function readRecruiterMetricsEnvironment(): string {
  const configuredEnvironment = readConfiguredMetricsEnvironment();
  if (configuredEnvironment) {
    return safeDimensionValue(configuredEnvironment, UNKNOWN_DIMENSION_VALUE);
  }

  const lambdaFunctionName = process.env.AWS_LAMBDA_FUNCTION_NAME?.trim();
  if (!lambdaFunctionName) return LOCAL_METRICS_ENVIRONMENT;

  return lambdaFunctionName.endsWith(DEV_LAMBDA_FUNCTION_SUFFIX)
    ? DEV_METRICS_ENVIRONMENT
    : PRODUCTION_METRICS_ENVIRONMENT;
}

function navLocaleDimension(value: unknown): string {
  if (
    typeof value === "string" &&
    (RECRUITER_NAV_LOCALES as readonly string[]).includes(value)
  ) {
    return value;
  }
  return UNKNOWN_DIMENSION_VALUE;
}

function outcomeDimension(value: unknown): RequestOutcomeDimension {
  if (
    typeof value === "string" &&
    (REQUEST_OUTCOMES as readonly string[]).includes(value)
  ) {
    return value as RequestOutcomeDimension;
  }
  return UNKNOWN_DIMENSION_VALUE;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function addMetric(
  metricValues: Record<string, number>,
  metricDefinitions: EmfMetricDefinition[],
  name: MetricName,
  value: unknown
): void {
  const numberValue = finiteNumber(value);
  if (numberValue === undefined) return;
  metricValues[name] = numberValue;
  metricDefinitions.push({ Name: name, Unit: METRIC_UNITS[name] });
}

function buildMetricPayload(params: {
  timestampMs: number;
  dimensions: readonly (readonly string[])[];
  metricDefinitions: EmfMetricDefinition[];
  metricValues: Record<string, number>;
  fields: Record<string, unknown>;
}): RequestTraceMetricPayload {
  return {
    _aws: {
      Timestamp: params.timestampMs,
      CloudWatchMetrics: [
        {
          Namespace: METRICS_NAMESPACE,
          Dimensions: params.dimensions,
          Metrics: params.metricDefinitions,
        },
      ],
    },
    service: SERVICE_DIMENSION_VALUE,
    ...params.fields,
    ...params.metricValues,
  } as RequestTraceMetricPayload;
}

function buildRequestMetricPayload(params: {
  traceLog: RequestTraceLogEnvelope;
  environment: string;
  navLocale: string;
  outcome: RequestOutcomeDimension;
  timestampMs: number;
}): RequestTraceMetricPayload {
  const { traceLog, environment, navLocale, outcome, timestampMs } = params;
  const metricValues: Record<string, number> = {};
  const metricDefinitions: EmfMetricDefinition[] = [];
  const totals = traceLog.totals;

  addMetric(metricValues, metricDefinitions, "RequestCount", 1);
  addMetric(
    metricValues,
    metricDefinitions,
    "RequestErrorCount",
    outcome === "error" ? 1 : 0
  );
  addMetric(
    metricValues,
    metricDefinitions,
    "RequestLatencyMs",
    traceLog.totalLatencyMs
  );
  addMetric(metricValues, metricDefinitions, "LlmCallCount", totals.llmCalls);
  addMetric(
    metricValues,
    metricDefinitions,
    "UsageKnownCallCount",
    totals.usageKnownCalls
  );
  addMetric(
    metricValues,
    metricDefinitions,
    "UsageMissingCallCount",
    totals.usageMissingCalls
  );
  addMetric(
    metricValues,
    metricDefinitions,
    "CostKnownCallCount",
    totals.costKnownCalls
  );
  addMetric(
    metricValues,
    metricDefinitions,
    "CostMissingCallCount",
    totals.costMissingCalls
  );
  addMetric(
    metricValues,
    metricDefinitions,
    "PromptTokens",
    totals.promptTokens
  );
  addMetric(
    metricValues,
    metricDefinitions,
    "CompletionTokens",
    totals.completionTokens
  );
  addMetric(
    metricValues,
    metricDefinitions,
    "EmbeddingTokens",
    totals.embeddingTokens
  );
  addMetric(metricValues, metricDefinitions, "TotalTokens", totals.totalTokens);
  addMetric(
    metricValues,
    metricDefinitions,
    "EstimatedCostUSD",
    totals.estimatedCostUSD
  );

  const retrieval = traceLog.retrieval;
  const retrievalFields: Record<string, unknown> = {};
  if (retrieval) {
    retrievalFields.retrievalProvider = safeDimensionValue(
      retrieval.provider,
      UNKNOWN_DIMENSION_VALUE
    );
    addMetric(
      metricValues,
      metricDefinitions,
      "RetrievalLatencyMs",
      retrieval.latencyMs
    );
    addMetric(metricValues, metricDefinitions, "RetrievalTopK", retrieval.topK);
    addMetric(
      metricValues,
      metricDefinitions,
      "RetrievalReturnedChunks",
      retrieval.returnedChunks
    );
    addMetric(
      metricValues,
      metricDefinitions,
      "RetrievalSimilarityMin",
      retrieval.similarityMin
    );
    addMetric(
      metricValues,
      metricDefinitions,
      "RetrievalSimilarityMax",
      retrieval.similarityMax
    );
  }

  return buildMetricPayload({
    timestampMs,
    dimensions: [REQUEST_DIMENSION_SET],
    metricDefinitions,
    metricValues,
    fields: {
      metricType: REQUEST_METRIC_TYPE,
      environment,
      navLocale,
      outcome,
      ...retrievalFields,
    },
  });
}

function stageTokenTotal(stage: StageRecord): number | undefined {
  const promptTokens = finiteNumber(stage.promptTokens);
  const completionTokens = finiteNumber(stage.completionTokens);
  const embeddingTokens = finiteNumber(stage.tokens);
  if (
    promptTokens === undefined &&
    completionTokens === undefined &&
    embeddingTokens === undefined
  ) {
    return undefined;
  }
  return (promptTokens ?? 0) + (completionTokens ?? 0) + (embeddingTokens ?? 0);
}

function buildStageMetricPayload(params: {
  stage: StageRecord;
  environment: string;
  navLocale: string;
  timestampMs: number;
}): RequestTraceMetricPayload {
  const { stage, environment, navLocale, timestampMs } = params;
  const metricValues: Record<string, number> = {};
  const metricDefinitions: EmfMetricDefinition[] = [];
  const stageOutcome = outcomeDimension(stage.status);

  addMetric(metricValues, metricDefinitions, "StageCallCount", 1);
  addMetric(
    metricValues,
    metricDefinitions,
    "StageErrorCount",
    stageOutcome === "error" ? 1 : 0
  );
  addMetric(metricValues, metricDefinitions, "StageLatencyMs", stage.latencyMs);
  addMetric(
    metricValues,
    metricDefinitions,
    "StagePromptTokens",
    stage.promptTokens
  );
  addMetric(
    metricValues,
    metricDefinitions,
    "StageCompletionTokens",
    stage.completionTokens
  );
  addMetric(
    metricValues,
    metricDefinitions,
    "StageEmbeddingTokens",
    stage.tokens
  );
  addMetric(
    metricValues,
    metricDefinitions,
    "StageTotalTokens",
    stageTokenTotal(stage)
  );
  addMetric(
    metricValues,
    metricDefinitions,
    "StageEstimatedCostUSD",
    stage.costUSD
  );

  return buildMetricPayload({
    timestampMs,
    dimensions: [STAGE_DIMENSION_SET],
    metricDefinitions,
    metricValues,
    fields: {
      metricType: STAGE_METRIC_TYPE,
      environment,
      navLocale,
      stage: safeDimensionValue(stage.stage, UNKNOWN_DIMENSION_VALUE),
      outcome: stageOutcome,
    },
  });
}

export function buildRequestTraceMetricEnvelopes(
  traceLog: RequestTraceLogEnvelope,
  options: RequestTraceMetricOptions = {}
): RequestTraceMetricPayload[] {
  const timestampMs = options.timestampMs ?? Date.now();
  const environment = safeDimensionValue(
    options.environment ?? readRecruiterMetricsEnvironment(),
    UNKNOWN_DIMENSION_VALUE
  );
  const navLocale = navLocaleDimension(traceLog.navLocale);
  const outcome = outcomeDimension(traceLog.outcome);

  return [
    buildRequestMetricPayload({
      traceLog,
      environment,
      navLocale,
      outcome,
      timestampMs,
    }),
    ...traceLog.stages.map((stage) =>
      buildStageMetricPayload({
        stage,
        environment,
        navLocale,
        timestampMs,
      })
    ),
  ];
}

export function emitRequestTraceMetrics(
  traceLog: RequestTraceLogEnvelope
): void {
  for (const metricEnvelope of buildRequestTraceMetricEnvelopes(traceLog)) {
    logInfo(METRICS_SCOPE, METRICS_MESSAGE, metricEnvelope);
  }
}
