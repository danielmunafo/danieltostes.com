import { formatDataStreamPart } from "ai";
import {
  CHART_DATA_CLOSE_MARKER,
  CHART_DATA_OPEN_MARKER,
} from "../../constants.js";
import { logInfo } from "../../logging/logger.js";
import type { ChartData } from "../../rag/chartDataSchema.js";
import type { RecruiterNavLocale } from "../../constants.js";
import type { RecruiterDataStream } from "../types.js";

export function emitPrePitchChartData(params: {
  dataStream: RecruiterDataStream;
  chartData: ChartData | null;
  navLocale: RecruiterNavLocale;
}): void {
  if (!params.chartData) {
    params.dataStream.write(
      formatDataStreamPart("text", CHART_DATA_CLOSE_MARKER)
    );
    return;
  }

  const chartJson = JSON.stringify(params.chartData);
  logInfo("matchProfile", "emitting chart marker block (pre-pitch)", {
    navLocale: params.navLocale,
    jsonChars: chartJson.length,
    technicalFit: params.chartData.assessmentSummary.technicalFit,
    recommendation: params.chartData.assessmentSummary.recommendation,
  });
  params.dataStream.write(
    formatDataStreamPart("text", `${chartJson}${CHART_DATA_CLOSE_MARKER}\n\n`)
  );
}

export function reemitChartDataAfterPitchSync(params: {
  dataStream: RecruiterDataStream;
  chartData: ChartData;
  navLocale: RecruiterNavLocale;
}): void {
  const chartJson = JSON.stringify(params.chartData);
  logInfo("matchProfile", "re-emitting chart marker block after pitch sync", {
    navLocale: params.navLocale,
    jsonChars: chartJson.length,
    technicalFit: params.chartData.assessmentSummary.technicalFit,
    recommendation: params.chartData.assessmentSummary.recommendation,
  });
  params.dataStream.write(
    formatDataStreamPart(
      "text",
      `${CHART_DATA_OPEN_MARKER}${chartJson}${CHART_DATA_CLOSE_MARKER}\n\n`
    )
  );
}
