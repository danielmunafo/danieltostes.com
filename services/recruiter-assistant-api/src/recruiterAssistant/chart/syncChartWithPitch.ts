import {
  alignChartAssessmentWithPitch,
  logChartAssessmentAlignment,
} from "../../rag/alignChartAssessment.js";
import { logInfo } from "../../logging/logger.js";
import type { ChartData } from "../../rag/chartDataSchema.js";
import type { RecruiterNavLocale } from "../../constants.js";
import type { RecruiterDataStream } from "../types.js";
import { reemitChartDataAfterPitchSync } from "./emitChartMarkers.js";

export async function syncChartWithPitch(params: {
  dataStream: RecruiterDataStream;
  chartData: ChartData | null;
  pitchText: string;
  navLocale: RecruiterNavLocale;
  isOffTopic: boolean;
}): Promise<ChartData | null> {
  if (!params.chartData) {
    if (!params.isOffTopic) {
      logInfo("matchProfile", "no chart markers emitted", {
        navLocale: params.navLocale,
      });
    }
    return null;
  }

  const pitchAligned = alignChartAssessmentWithPitch(
    params.chartData,
    params.pitchText,
    params.navLocale
  );

  if (pitchAligned.adjusted) {
    reemitChartDataAfterPitchSync({
      dataStream: params.dataStream,
      chartData: pitchAligned.chart,
      navLocale: params.navLocale,
    });
    logChartAssessmentAlignment("pitch", params.navLocale, pitchAligned.fields);
    return pitchAligned.chart;
  }

  return params.chartData;
}
