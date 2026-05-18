import { formatDataStreamPart } from "ai";
import {
  BRIEFING_PREP_CLOSE_MARKER,
  BRIEFING_PREP_OPEN_MARKER,
  CHART_DATA_OPEN_MARKER,
  THINKING_CLOSE_MARKER,
  THINKING_OPEN_MARKER,
} from "../../constants.js";
import type { RecruiterDataStream } from "../types.js";

export function writeThinkingOpen(dataStream: RecruiterDataStream): void {
  dataStream.write(formatDataStreamPart("text", `${THINKING_OPEN_MARKER}\n`));
}

export function writeThinkingClose(dataStream: RecruiterDataStream): void {
  dataStream.write(
    formatDataStreamPart("text", `\n${THINKING_CLOSE_MARKER}\n\n`)
  );
}

export function writeChartOpen(dataStream: RecruiterDataStream): void {
  dataStream.write(formatDataStreamPart("text", CHART_DATA_OPEN_MARKER));
}

export function writeBriefingPrepOpen(dataStream: RecruiterDataStream): void {
  dataStream.write(formatDataStreamPart("text", BRIEFING_PREP_OPEN_MARKER));
}

export function writeBriefingPrepClose(dataStream: RecruiterDataStream): void {
  dataStream.write(formatDataStreamPart("text", BRIEFING_PREP_CLOSE_MARKER));
}
