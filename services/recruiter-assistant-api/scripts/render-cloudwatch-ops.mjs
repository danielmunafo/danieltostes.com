#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const METRICS_NAMESPACE = "DanielTostes/RecruiterAssistant";

const DEFAULT_SERVICE = "recruiter-api";
const DEFAULT_ENVIRONMENT = "production";
const DEFAULT_REGION = "us-east-1";
const DEFAULT_PERIOD_SECONDS = 300;
const DEFAULT_OUTPUT_DIR = "ops/cloudwatch";

const REQUEST_DIMENSIONS = ["service", "environment", "navLocale", "outcome"];
const STAGE_DIMENSIONS = [
  "service",
  "environment",
  "navLocale",
  "stage",
  "outcome",
];

const DIMENSION_VALUE_REGEX = /^[A-Za-z0-9_.:/+=@-]{1,128}$/;

const REQUEST_METRICS = {
  count: "RequestCount",
  errors: "RequestErrorCount",
  latency: "RequestLatencyMs",
  usageMissing: "UsageMissingCallCount",
  costMissing: "CostMissingCallCount",
  promptTokens: "PromptTokens",
  completionTokens: "CompletionTokens",
  embeddingTokens: "EmbeddingTokens",
  totalTokens: "TotalTokens",
  estimatedCost: "EstimatedCostUSD",
  retrievalReturnedChunks: "RetrievalReturnedChunks",
  retrievalSimilarityMin: "RetrievalSimilarityMin",
  retrievalSimilarityMax: "RetrievalSimilarityMax",
};

const STAGE_METRICS = {
  calls: "StageCallCount",
  errors: "StageErrorCount",
  latency: "StageLatencyMs",
  totalTokens: "StageTotalTokens",
  estimatedCost: "StageEstimatedCostUSD",
};

const DEFAULT_ALARM_THRESHOLDS = {
  requestErrorCount: 1,
  requestLatencyAverageMs: 15000,
  missingUsageCount: 3,
  missingCostCount: 3,
  retrievalReturnedChunksMin: 10,
  retrievalSimilarityMin: 0.2,
};

const ALARM_EVALUATION_PERIODS = 3;
const ALARM_DATAPOINTS_TO_ALARM = 2;

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

function assertDimensionValue(name, value) {
  if (!DIMENSION_VALUE_REGEX.test(value)) {
    throw new Error(
      `${name} must match ${DIMENSION_VALUE_REGEX} to be usable as a CloudWatch dimension`
    );
  }
}

function readArgValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parsePositiveNumber(value, flag) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${flag} must be a positive number`);
  }
  return numberValue;
}

function parseCliArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--environment":
        options.environment = readArgValue(args, index, arg);
        index += 1;
        break;
      case "--region":
        options.region = readArgValue(args, index, arg);
        index += 1;
        break;
      case "--service":
        options.service = readArgValue(args, index, arg);
        index += 1;
        break;
      case "--namespace":
        options.namespace = readArgValue(args, index, arg);
        index += 1;
        break;
      case "--dashboard-name":
        options.dashboardName = readArgValue(args, index, arg);
        index += 1;
        break;
      case "--output-dir":
        options.outputDir = readArgValue(args, index, arg);
        index += 1;
        break;
      case "--alarm-prefix":
        options.alarmPrefix = readArgValue(args, index, arg);
        index += 1;
        break;
      case "--alarm-action-arn":
        options.alarmActionArns = [
          ...(options.alarmActionArns ?? []),
          readArgValue(args, index, arg),
        ];
        index += 1;
        break;
      case "--period-seconds":
        options.periodSeconds = parsePositiveNumber(
          readArgValue(args, index, arg),
          arg
        );
        index += 1;
        break;
      case "--request-error-count":
        options.requestErrorCount = parsePositiveNumber(
          readArgValue(args, index, arg),
          arg
        );
        index += 1;
        break;
      case "--request-latency-average-ms":
        options.requestLatencyAverageMs = parsePositiveNumber(
          readArgValue(args, index, arg),
          arg
        );
        index += 1;
        break;
      case "--missing-usage-count":
        options.missingUsageCount = parsePositiveNumber(
          readArgValue(args, index, arg),
          arg
        );
        index += 1;
        break;
      case "--missing-cost-count":
        options.missingCostCount = parsePositiveNumber(
          readArgValue(args, index, arg),
          arg
        );
        index += 1;
        break;
      case "--retrieval-returned-chunks-min":
        options.retrievalReturnedChunksMin = parsePositiveNumber(
          readArgValue(args, index, arg),
          arg
        );
        index += 1;
        break;
      case "--retrieval-similarity-min":
        options.retrievalSimilarityMin = parsePositiveNumber(
          readArgValue(args, index, arg),
          arg
        );
        index += 1;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  npm run ops:cloudwatch -- --environment production --region us-east-1 --output-dir /tmp/recruiter-cloudwatch

Options:
  --environment <name>                 Metrics environment dimension. Default: production
  --region <aws-region>                Dashboard widget region. Default: AWS_REGION or us-east-1
  --output-dir <path>                  Output directory. Default: ops/cloudwatch
  --dashboard-name <name>              CloudWatch dashboard name. Default: RecruiterAssistant-<environment>
  --alarm-prefix <name>                Alarm name prefix. Default: recruiter-assistant-<environment>
  --alarm-action-arn <arn>             Optional SNS topic or action ARN. Repeatable
  --period-seconds <seconds>           Metric query period. Default: 300
  --request-error-count <n>            Alarm threshold. Default: 1
  --request-latency-average-ms <n>     Alarm threshold. Default: 15000
  --missing-usage-count <n>            Alarm threshold. Default: 3
  --missing-cost-count <n>             Alarm threshold. Default: 3
  --retrieval-returned-chunks-min <n>  Alarm threshold. Default: 10
  --retrieval-similarity-min <n>       Alarm threshold. Default: 0.2`);
}

function normalizeConfig(options = {}) {
  const environment =
    options.environment ??
    process.env.RECRUITER_METRICS_ENVIRONMENT ??
    DEFAULT_ENVIRONMENT;
  const region =
    options.region ??
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    DEFAULT_REGION;
  const service = options.service ?? DEFAULT_SERVICE;
  const namespace = options.namespace ?? METRICS_NAMESPACE;
  const dashboardName =
    options.dashboardName ?? `RecruiterAssistant-${environment}`;
  const alarmPrefix =
    options.alarmPrefix ?? `recruiter-assistant-${environment}`;
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
  const periodSeconds = options.periodSeconds ?? DEFAULT_PERIOD_SECONDS;
  const alarmActionArns = options.alarmActionArns ?? [];

  assertDimensionValue("environment", environment);
  assertDimensionValue("service", service);

  return {
    alarmActionArns,
    alarmPrefix,
    dashboardName,
    environment,
    namespace,
    outputDir,
    periodSeconds,
    region,
    service,
    thresholds: {
      requestErrorCount:
        options.requestErrorCount ?? DEFAULT_ALARM_THRESHOLDS.requestErrorCount,
      requestLatencyAverageMs:
        options.requestLatencyAverageMs ??
        DEFAULT_ALARM_THRESHOLDS.requestLatencyAverageMs,
      missingUsageCount:
        options.missingUsageCount ?? DEFAULT_ALARM_THRESHOLDS.missingUsageCount,
      missingCostCount:
        options.missingCostCount ?? DEFAULT_ALARM_THRESHOLDS.missingCostCount,
      retrievalReturnedChunksMin:
        options.retrievalReturnedChunksMin ??
        DEFAULT_ALARM_THRESHOLDS.retrievalReturnedChunksMin,
      retrievalSimilarityMin:
        options.retrievalSimilarityMin ??
        DEFAULT_ALARM_THRESHOLDS.retrievalSimilarityMin,
    },
  };
}

function schema(namespace, dimensions) {
  return `SCHEMA("${namespace}", ${dimensions.join(", ")})`;
}

function metricFilter(config) {
  return `service = '${config.service}' AND environment = '${config.environment}'`;
}

function queryMetric({
  statistic,
  metricName,
  dimensions,
  config,
  where = [],
  groupBy,
  orderBy,
  limit,
}) {
  const whereClause = [metricFilter(config), ...where].join(" AND ");
  const parts = [
    `SELECT ${statistic}(${metricName})`,
    `FROM ${schema(config.namespace, dimensions)}`,
    `WHERE ${whereClause}`,
  ];

  if (groupBy) parts.push(`GROUP BY ${groupBy}`);
  if (orderBy) parts.push(`ORDER BY ${orderBy}`);
  if (limit) parts.push(`LIMIT ${limit}`);

  return parts.join(" ");
}

function searchMetric({ metricName, statistic, dimensions, config }) {
  const dimensionScope = [config.namespace, ...dimensions].join(",");
  return `SEARCH('{${dimensionScope}} MetricName="${metricName}" service="${config.service}" environment="${config.environment}"', '${statistic}')`;
}

function expressionMetric({ expression, id, label, visible, yAxis }) {
  return [
    [
      {
        expression,
        id,
        label,
        ...(visible === false ? { visible: false } : {}),
        ...(yAxis ? { yAxis } : {}),
      },
    ],
  ];
}

function widget({
  title,
  x,
  y,
  width,
  height,
  metrics,
  config,
  view = "timeSeries",
}) {
  return {
    type: "metric",
    x,
    y,
    width,
    height,
    properties: {
      metrics,
      period: config.periodSeconds,
      region: config.region,
      stat: "Average",
      title,
      view,
    },
  };
}

function buildDashboardBody(config) {
  const requestCountQuery = queryMetric({
    statistic: "SUM",
    metricName: REQUEST_METRICS.count,
    dimensions: REQUEST_DIMENSIONS,
    config,
  });
  const requestErrorQuery = queryMetric({
    statistic: "SUM",
    metricName: REQUEST_METRICS.errors,
    dimensions: REQUEST_DIMENSIONS,
    config,
  });
  const requestErrorRatioQuery = queryMetric({
    statistic: "AVG",
    metricName: REQUEST_METRICS.errors,
    dimensions: REQUEST_DIMENSIONS,
    config,
  });

  return {
    start: "-PT6H",
    periodOverride: "inherit",
    widgets: [
      {
        type: "text",
        x: 0,
        y: 0,
        width: 24,
        height: 2,
        properties: {
          markdown: [
            `# Recruiter assistant operations (${config.environment})`,
            "",
            `Namespace: \`${config.namespace}\``,
            `Service: \`${config.service}\``,
          ].join("\n"),
        },
      },
      widget({
        title: "Requests and error ratio",
        x: 0,
        y: 2,
        width: 12,
        height: 6,
        config,
        metrics: [
          ...expressionMetric({
            expression: requestCountQuery,
            id: "requests",
            label: "Requests",
          }),
          ...expressionMetric({
            expression: requestErrorQuery,
            id: "errors",
            label: "Request errors",
          }),
          ...expressionMetric({
            expression: requestErrorRatioQuery,
            id: "error_ratio",
            label: "Error ratio",
            yAxis: "right",
          }),
        ],
      }),
      widget({
        title: "Request latency p95 by locale/outcome",
        x: 12,
        y: 2,
        width: 12,
        height: 6,
        config,
        metrics: [
          ...expressionMetric({
            expression: searchMetric({
              metricName: REQUEST_METRICS.latency,
              statistic: "p95",
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            id: "request_latency_p95",
            label: "RequestLatencyMs p95",
          }),
        ],
      }),
      widget({
        title: "Request latency p50 by locale/outcome",
        x: 0,
        y: 8,
        width: 12,
        height: 6,
        config,
        metrics: [
          ...expressionMetric({
            expression: searchMetric({
              metricName: REQUEST_METRICS.latency,
              statistic: "p50",
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            id: "request_latency_p50",
            label: "RequestLatencyMs p50",
          }),
        ],
      }),
      widget({
        title: "Stage latency average by stage",
        x: 12,
        y: 8,
        width: 12,
        height: 6,
        config,
        metrics: [
          ...expressionMetric({
            expression: queryMetric({
              statistic: "AVG",
              metricName: STAGE_METRICS.latency,
              dimensions: STAGE_DIMENSIONS,
              config,
              groupBy: "stage",
              orderBy: "AVG() DESC",
              limit: 12,
            }),
            id: "stage_latency",
            label: "StageLatencyMs avg",
          }),
        ],
      }),
      widget({
        title: "Stage errors by stage",
        x: 0,
        y: 14,
        width: 12,
        height: 6,
        config,
        metrics: [
          ...expressionMetric({
            expression: queryMetric({
              statistic: "SUM",
              metricName: STAGE_METRICS.errors,
              dimensions: STAGE_DIMENSIONS,
              config,
              groupBy: "stage",
              orderBy: "SUM() DESC",
              limit: 12,
            }),
            id: "stage_errors",
            label: "Stage errors",
          }),
        ],
      }),
      widget({
        title: "Token totals",
        x: 12,
        y: 14,
        width: 12,
        height: 6,
        config,
        metrics: [
          ...expressionMetric({
            expression: queryMetric({
              statistic: "SUM",
              metricName: REQUEST_METRICS.promptTokens,
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            id: "prompt_tokens",
            label: "Prompt tokens",
          }),
          ...expressionMetric({
            expression: queryMetric({
              statistic: "SUM",
              metricName: REQUEST_METRICS.completionTokens,
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            id: "completion_tokens",
            label: "Completion tokens",
          }),
          ...expressionMetric({
            expression: queryMetric({
              statistic: "SUM",
              metricName: REQUEST_METRICS.embeddingTokens,
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            id: "embedding_tokens",
            label: "Embedding tokens",
          }),
          ...expressionMetric({
            expression: queryMetric({
              statistic: "SUM",
              metricName: REQUEST_METRICS.totalTokens,
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            id: "total_tokens",
            label: "Total tokens",
          }),
        ],
      }),
      widget({
        title: "Estimated cost and missing accounting",
        x: 0,
        y: 20,
        width: 12,
        height: 6,
        config,
        metrics: [
          ...expressionMetric({
            expression: queryMetric({
              statistic: "SUM",
              metricName: REQUEST_METRICS.estimatedCost,
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            id: "estimated_cost",
            label: "Estimated cost USD",
          }),
          ...expressionMetric({
            expression: queryMetric({
              statistic: "SUM",
              metricName: REQUEST_METRICS.usageMissing,
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            id: "missing_usage",
            label: "Missing usage calls",
            yAxis: "right",
          }),
          ...expressionMetric({
            expression: queryMetric({
              statistic: "SUM",
              metricName: REQUEST_METRICS.costMissing,
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            id: "missing_cost",
            label: "Missing cost calls",
            yAxis: "right",
          }),
        ],
      }),
      widget({
        title: "Retrieval health",
        x: 12,
        y: 20,
        width: 12,
        height: 6,
        config,
        metrics: [
          ...expressionMetric({
            expression: queryMetric({
              statistic: "AVG",
              metricName: REQUEST_METRICS.retrievalReturnedChunks,
              dimensions: REQUEST_DIMENSIONS,
              config,
              where: ["outcome = 'success'"],
            }),
            id: "retrieval_chunks",
            label: "Returned chunks avg",
          }),
          ...expressionMetric({
            expression: queryMetric({
              statistic: "MIN",
              metricName: REQUEST_METRICS.retrievalSimilarityMin,
              dimensions: REQUEST_DIMENSIONS,
              config,
              where: ["outcome = 'success'"],
            }),
            id: "retrieval_similarity_min",
            label: "Similarity min",
            yAxis: "right",
          }),
          ...expressionMetric({
            expression: queryMetric({
              statistic: "MAX",
              metricName: REQUEST_METRICS.retrievalSimilarityMax,
              dimensions: REQUEST_DIMENSIONS,
              config,
              where: ["outcome = 'success'"],
            }),
            id: "retrieval_similarity_max",
            label: "Similarity max",
            yAxis: "right",
          }),
        ],
      }),
    ],
  };
}

function queryAlarmPayload({
  alarmName,
  description,
  comparisonOperator,
  threshold,
  treatMissingData = "notBreaching",
  metrics,
  config,
}) {
  return {
    AlarmName: alarmName,
    AlarmDescription: description,
    ActionsEnabled: config.alarmActionArns.length > 0,
    AlarmActions: config.alarmActionArns,
    OKActions: config.alarmActionArns,
    EvaluationPeriods: ALARM_EVALUATION_PERIODS,
    DatapointsToAlarm: ALARM_DATAPOINTS_TO_ALARM,
    ComparisonOperator: comparisonOperator,
    Threshold: threshold,
    TreatMissingData: treatMissingData,
    Metrics: metrics,
  };
}

function queryData({ id, expression, label, period, returnData = false }) {
  return {
    Id: id,
    Expression: expression,
    Label: label,
    Period: period,
    ReturnData: returnData,
  };
}

function buildAlarmInputs(config) {
  const requestErrorQuery = queryMetric({
    statistic: "SUM",
    metricName: REQUEST_METRICS.errors,
    dimensions: REQUEST_DIMENSIONS,
    config,
  });

  return [
    {
      fileName: "request-error-count.json",
      payload: queryAlarmPayload({
        alarmName: `${config.alarmPrefix}-request-error-count`,
        description:
          "Recruiter assistant request errors are above the configured threshold.",
        comparisonOperator: "GreaterThanOrEqualToThreshold",
        threshold: config.thresholds.requestErrorCount,
        config,
        metrics: [
          queryData({
            id: "errors",
            expression: requestErrorQuery,
            label: "Request errors",
            period: config.periodSeconds,
            returnData: true,
          }),
        ],
      }),
    },
    {
      fileName: "request-latency-average.json",
      payload: queryAlarmPayload({
        alarmName: `${config.alarmPrefix}-request-latency-average`,
        description:
          "Recruiter assistant average request latency is above the configured threshold.",
        comparisonOperator: "GreaterThanOrEqualToThreshold",
        threshold: config.thresholds.requestLatencyAverageMs,
        config,
        metrics: [
          queryData({
            id: "request_latency",
            expression: queryMetric({
              statistic: "AVG",
              metricName: REQUEST_METRICS.latency,
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            label: "Request latency average ms",
            period: config.periodSeconds,
            returnData: true,
          }),
        ],
      }),
    },
    {
      fileName: "missing-usage-count.json",
      payload: queryAlarmPayload({
        alarmName: `${config.alarmPrefix}-missing-usage-count`,
        description:
          "AI provider responses are missing token usage more often than expected.",
        comparisonOperator: "GreaterThanOrEqualToThreshold",
        threshold: config.thresholds.missingUsageCount,
        config,
        metrics: [
          queryData({
            id: "missing_usage",
            expression: queryMetric({
              statistic: "SUM",
              metricName: REQUEST_METRICS.usageMissing,
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            label: "Missing usage calls",
            period: config.periodSeconds,
            returnData: true,
          }),
        ],
      }),
    },
    {
      fileName: "missing-cost-count.json",
      payload: queryAlarmPayload({
        alarmName: `${config.alarmPrefix}-missing-cost-count`,
        description:
          "Cost estimates are missing more often than expected, usually because a model price is unknown.",
        comparisonOperator: "GreaterThanOrEqualToThreshold",
        threshold: config.thresholds.missingCostCount,
        config,
        metrics: [
          queryData({
            id: "missing_cost",
            expression: queryMetric({
              statistic: "SUM",
              metricName: REQUEST_METRICS.costMissing,
              dimensions: REQUEST_DIMENSIONS,
              config,
            }),
            label: "Missing cost calls",
            period: config.periodSeconds,
            returnData: true,
          }),
        ],
      }),
    },
    {
      fileName: "retrieval-returned-chunks-low.json",
      payload: queryAlarmPayload({
        alarmName: `${config.alarmPrefix}-retrieval-returned-chunks-low`,
        description:
          "Successful recruiter assistant requests are returning fewer retrieval chunks than expected.",
        comparisonOperator: "LessThanOrEqualToThreshold",
        threshold: config.thresholds.retrievalReturnedChunksMin,
        config,
        metrics: [
          queryData({
            id: "retrieval_chunks",
            expression: queryMetric({
              statistic: "AVG",
              metricName: REQUEST_METRICS.retrievalReturnedChunks,
              dimensions: REQUEST_DIMENSIONS,
              config,
              where: ["outcome = 'success'"],
            }),
            label: "Returned chunks average",
            period: config.periodSeconds,
            returnData: true,
          }),
        ],
      }),
    },
    {
      fileName: "retrieval-similarity-min-low.json",
      payload: queryAlarmPayload({
        alarmName: `${config.alarmPrefix}-retrieval-similarity-min-low`,
        description:
          "Successful recruiter assistant requests have unusually low minimum retrieval similarity.",
        comparisonOperator: "LessThanOrEqualToThreshold",
        threshold: config.thresholds.retrievalSimilarityMin,
        config,
        metrics: [
          queryData({
            id: "retrieval_similarity_min",
            expression: queryMetric({
              statistic: "MIN",
              metricName: REQUEST_METRICS.retrievalSimilarityMin,
              dimensions: REQUEST_DIMENSIONS,
              config,
              where: ["outcome = 'success'"],
            }),
            label: "Retrieval similarity minimum",
            period: config.periodSeconds,
            returnData: true,
          }),
        ],
      }),
    },
  ];
}

export function buildCloudWatchOpsArtifacts(options = {}) {
  const config = normalizeConfig(options);
  return {
    config,
    dashboardBody: buildDashboardBody(config),
    alarmInputs: buildAlarmInputs(config),
  };
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeArtifacts(artifacts) {
  const outputDir = path.resolve(artifacts.config.outputDir);
  const alarmsDir = path.join(outputDir, "alarms");

  await mkdir(alarmsDir, { recursive: true });

  const dashboardPath = path.join(outputDir, "dashboard-body.json");
  await writeJson(dashboardPath, artifacts.dashboardBody);

  const alarmPaths = [];
  for (const alarmInput of artifacts.alarmInputs) {
    const alarmPath = path.join(alarmsDir, alarmInput.fileName);
    await writeJson(alarmPath, alarmInput.payload);
    alarmPaths.push(alarmPath);
  }

  return { dashboardPath, alarmPaths, outputDir };
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const artifacts = buildCloudWatchOpsArtifacts(options);
  const { dashboardPath, alarmPaths, outputDir } =
    await writeArtifacts(artifacts);

  console.log(`Wrote CloudWatch artifacts to ${outputDir}`);
  console.log(
    `aws cloudwatch put-dashboard --dashboard-name ${artifacts.config.dashboardName} --dashboard-body file://${dashboardPath}`
  );
  for (const alarmPath of alarmPaths) {
    console.log(
      `aws cloudwatch put-metric-alarm --cli-input-json file://${alarmPath}`
    );
  }
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
