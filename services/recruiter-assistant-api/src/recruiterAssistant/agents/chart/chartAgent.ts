import { emitPrePitchChart } from "./emitPrePitchChart.js";
import { projectChart } from "./projectChart.js";

export const chartAgent = {
  projectChart,
  emitPrePitchChart,
} as const;
