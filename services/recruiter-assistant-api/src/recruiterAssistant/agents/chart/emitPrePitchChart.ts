import type { ChartData } from "../../../rag/chartDataSchema.js";
import type { RecruiterNavLocale } from "../../../constants.js";
import { emitPrePitchChartData } from "../../chart/emitChartMarkers.js";
import type { RecruiterDataStream } from "../../types.js";

export function emitPrePitchChart(params: {
  dataStream: RecruiterDataStream;
  chartData: ChartData | null;
  navLocale: RecruiterNavLocale;
}): void {
  emitPrePitchChartData(params);
}
