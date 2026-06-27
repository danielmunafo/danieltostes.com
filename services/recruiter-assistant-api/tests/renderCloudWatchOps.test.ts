import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SERVICE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const METRICS_NAMESPACE = "DanielTostes/RecruiterAssistant";

const REQUIRED_DASHBOARD_METRICS = [
  "RequestCount",
  "RequestErrorCount",
  "RequestLatencyMs",
  "StageLatencyMs",
  "StageErrorCount",
  "PromptTokens",
  "CompletionTokens",
  "EmbeddingTokens",
  "TotalTokens",
  "EstimatedCostUSD",
  "UsageMissingCallCount",
  "CostMissingCallCount",
  "RetrievalReturnedChunks",
  "RetrievalSimilarityMin",
  "RetrievalSimilarityMax",
  "FeedbackCount",
  "NegativeFeedbackCount",
];

const REQUIRED_ALARM_METRICS = [
  "RequestErrorCount",
  "RequestLatencyMs",
  "UsageMissingCallCount",
  "CostMissingCallCount",
  "RetrievalReturnedChunks",
  "RetrievalSimilarityMin",
  "NegativeFeedbackCount",
];

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

describe("render-cloudwatch-ops", () => {
  it("writes syntactically valid dashboard and alarm JSON from current metric names", () => {
    const outputDir = mkdtempSync(
      path.join(tmpdir(), "recruiter-cloudwatch-test-")
    );

    try {
      execFileSync(
        process.execPath,
        [
          "scripts/render-cloudwatch-ops.mjs",
          "--environment",
          "dev",
          "--region",
          "us-east-1",
          "--output-dir",
          outputDir,
        ],
        { cwd: SERVICE_ROOT, stdio: "pipe" }
      );

      const dashboard = readJson(path.join(outputDir, "dashboard-body.json"));
      const dashboardJson = JSON.stringify(dashboard);
      const dashboardBody = dashboard as {
        widgets: Array<{ properties?: { metrics?: unknown[] } }>;
      };
      expect(dashboardJson).toContain(METRICS_NAMESPACE);
      expect(dashboardJson).toContain("service = 'recruiter-api'");
      expect(dashboardJson).toContain("environment = 'dev'");
      expect(dashboardJson).toContain("navLocale");
      expect(dashboardJson).toContain("outcome");
      expect(dashboardJson).toContain("stage");
      expect(dashboardJson).toContain("rating");
      expect(dashboardJson).toContain("reason");
      expect(dashboardJson).toContain("p95");
      expect(dashboardJson).toContain("p50");
      expect(dashboardJson).toContain("AVG(RequestErrorCount)");
      expect(dashboardJson).toContain("GROUP BY outcome");
      expect(dashboardJson).not.toContain("IF(requests > 0");

      for (const metricName of REQUIRED_DASHBOARD_METRICS) {
        expect(dashboardJson).toContain(metricName);
      }
      for (const widget of dashboardBody.widgets) {
        let metricsInsightsQueryCount = 0;
        for (const metric of widget.properties?.metrics ?? []) {
          expect(Array.isArray(metric)).toBe(true);
          const [metricConfig] = metric as Array<{
            expression?: unknown;
          }>;
          if (
            typeof metricConfig?.expression === "string" &&
            metricConfig.expression.startsWith("SELECT ")
          ) {
            metricsInsightsQueryCount += 1;
          }
        }
        expect(metricsInsightsQueryCount).toBeLessThanOrEqual(1);
      }

      const alarmsDir = path.join(outputDir, "alarms");
      const alarmFiles = readdirSync(alarmsDir).sort();
      expect(alarmFiles).toEqual([
        "missing-cost-count.json",
        "missing-usage-count.json",
        "negative-feedback-count.json",
        "request-error-count.json",
        "request-latency-average.json",
        "retrieval-returned-chunks-low.json",
        "retrieval-similarity-min-low.json",
      ]);

      const alarmPayloads = alarmFiles.map((alarmFile) =>
        readJson(path.join(alarmsDir, alarmFile))
      );
      const alarmJson = JSON.stringify(alarmPayloads);
      expect(alarmJson).toContain(METRICS_NAMESPACE);
      expect(alarmJson).toContain("environment = 'dev'");
      expect(alarmJson).not.toContain("123456789012");

      for (const metricName of REQUIRED_ALARM_METRICS) {
        expect(alarmJson).toContain(metricName);
      }

      for (const alarmPayload of alarmPayloads) {
        expect(alarmPayload).toMatchObject({
          ActionsEnabled: false,
          AlarmActions: [],
          OKActions: [],
        });
      }
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
