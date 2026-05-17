import { generatePitch } from "../pitch/generatePitch.js";
import { evaluateOffTopic } from "./evaluateOffTopic.js";
import { projectBriefingAndChart } from "./projectBriefingAndChart.js";
import { syncChartWithPitch } from "./syncChartWithPitch.js";

/** Recruiter-facing stream: off-topic detection, briefing prep, chart, pitch, chart sync. */
export const recruiterAgent = {
  evaluateOffTopic,
  projectBriefingAndChart,
  generatePitch,
  syncChartWithPitch,
} as const;
