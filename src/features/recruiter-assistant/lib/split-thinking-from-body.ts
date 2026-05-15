import type { ChartData } from "./chart-data-types";
import { parseChartDataJson } from "./parse-chart-data-json";

/**
 * Sentinel markers wrapping the evidence brief in the streamed assistant
 * response. Kept in sync with the recruiter-assistant API; values must match exactly.
 */
export const THINKING_OPEN_MARKER = "[[THINKING_START]]";
export const THINKING_CLOSE_MARKER = "[[THINKING_END]]";

/** Chart JSON block between thinking close and pitch (API constants). */
export const CHART_DATA_OPEN_MARKER = "[[CHART_DATA_START]]";
export const CHART_DATA_CLOSE_MARKER = "[[CHART_DATA_END]]";

/** Ephemeral streamed status between thinking close and chart (API constants). */
export const BRIEFING_PREP_OPEN_MARKER = "[[BRIEFING_PREP_START]]";
export const BRIEFING_PREP_CLOSE_MARKER = "[[BRIEFING_PREP_END]]";

export interface ThinkingSplit {
  /** Brief content between the open and (optional) close markers, trimmed. */
  readonly thinking: string;
  /** The remaining assistant text (pitch + references), trimmed; chart markers stripped. */
  readonly body: string;
  /**
   * True when the open marker has been seen but the close marker has not yet
   * arrived — the brief is still streaming.
   */
  readonly isThinkingStreaming: boolean;
  /** True when at least the open marker has been seen. */
  readonly hasThinking: boolean;
  /** Parsed match profile data when a complete chart marker block is present. */
  readonly chartData: ChartData | null;
  /** True when open chart marker seen but close marker not yet received. */
  readonly hasChartMarkerOpen: boolean;
  /** One-line prep status between evidence review and chart (stripped from body). */
  readonly briefingPrep: string;
  /** True while the prep status line is still streaming. */
  readonly isBriefingPrepStreaming: boolean;
}

function normalizeBriefingPrepText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .slice(0, 4)
    .join("\n");
}

function stripBriefingPrepBlock(suffix: string): {
  readonly cleanedSuffix: string;
  readonly briefingPrep: string;
  readonly isBriefingPrepStreaming: boolean;
} {
  const openIdx = suffix.indexOf(BRIEFING_PREP_OPEN_MARKER);
  if (openIdx === -1) {
    return {
      cleanedSuffix: suffix,
      briefingPrep: "",
      isBriefingPrepStreaming: false,
    };
  }

  const afterOpen = openIdx + BRIEFING_PREP_OPEN_MARKER.length;
  const closeIdx = suffix.indexOf(BRIEFING_PREP_CLOSE_MARKER, afterOpen);
  const beforeOpen = suffix.slice(0, openIdx);

  if (closeIdx === -1) {
    return {
      cleanedSuffix: beforeOpen.trim(),
      briefingPrep: normalizeBriefingPrepText(suffix.slice(afterOpen)),
      isBriefingPrepStreaming: true,
    };
  }

  const afterClose = closeIdx + BRIEFING_PREP_CLOSE_MARKER.length;
  return {
    cleanedSuffix: `${beforeOpen}${suffix.slice(afterClose)}`.trim(),
    briefingPrep: normalizeBriefingPrepText(suffix.slice(afterOpen, closeIdx)),
    isBriefingPrepStreaming: false,
  };
}

function stripPostThinkingSuffix(suffixRaw: string): {
  readonly body: string;
  readonly chartData: ChartData | null;
  readonly hasChartMarkerOpen: boolean;
  readonly briefingPrep: string;
  readonly isBriefingPrepStreaming: boolean;
} {
  const prepSplit = stripBriefingPrepBlock(suffixRaw);
  const chartSplit = stripChartMarkerBlock(prepSplit.cleanedSuffix);
  return {
    body: chartSplit.cleanedBody,
    chartData: chartSplit.chartData,
    hasChartMarkerOpen: chartSplit.hasChartMarkerOpen,
    briefingPrep: prepSplit.briefingPrep,
    isBriefingPrepStreaming: prepSplit.isBriefingPrepStreaming,
  };
}

function stripChartMarkerBlock(body: string): {
  readonly cleanedBody: string;
  readonly chartData: ChartData | null;
  readonly hasChartMarkerOpen: boolean;
} {
  const openIdx = body.indexOf(CHART_DATA_OPEN_MARKER);
  if (openIdx === -1) {
    return { cleanedBody: body, chartData: null, hasChartMarkerOpen: false };
  }

  const afterOpen = openIdx + CHART_DATA_OPEN_MARKER.length;
  const closeIdx = body.indexOf(CHART_DATA_CLOSE_MARKER, afterOpen);

  const beforeOpen = body.slice(0, openIdx);
  const afterBlockStart =
    closeIdx === -1 ? body.length : closeIdx + CHART_DATA_CLOSE_MARKER.length;
  const afterBlock = body.slice(afterBlockStart);

  const cleanedBody = `${beforeOpen}${afterBlock}`.trim();

  if (closeIdx === -1) {
    return {
      cleanedBody,
      chartData: null,
      hasChartMarkerOpen: true,
    };
  }

  const jsonText = body.slice(afterOpen, closeIdx).trim();
  const chartData = parseChartDataJson(jsonText);

  return {
    cleanedBody,
    chartData,
    hasChartMarkerOpen: false,
  };
}

/**
 * Splits a streamed assistant message into the evidence-brief "thinking"
 * portion and the main pitch body, based on sentinel markers emitted by the
 * recruiter-assistant API. Designed to be safe to call on partial streams.
 */
export function splitThinkingFromBody(text: string): ThinkingSplit {
  const openIdx = text.indexOf(THINKING_OPEN_MARKER);
  if (openIdx === -1) {
    const suffixSplit = stripPostThinkingSuffix(text);
    return {
      thinking: "",
      body: suffixSplit.body,
      isThinkingStreaming: false,
      hasThinking: false,
      chartData: suffixSplit.chartData,
      hasChartMarkerOpen: suffixSplit.hasChartMarkerOpen,
      briefingPrep: suffixSplit.briefingPrep,
      isBriefingPrepStreaming: suffixSplit.isBriefingPrepStreaming,
    };
  }

  const afterOpen = openIdx + THINKING_OPEN_MARKER.length;
  const closeIdx = text.indexOf(THINKING_CLOSE_MARKER, afterOpen);
  const beforeOpen = text.slice(0, openIdx);

  if (closeIdx === -1) {
    const partialThinking = text.slice(afterOpen).trim();
    const prefixSplit = stripPostThinkingSuffix(beforeOpen.trim());
    return {
      thinking: partialThinking,
      body: prefixSplit.body,
      isThinkingStreaming: true,
      hasThinking: true,
      chartData: prefixSplit.chartData,
      hasChartMarkerOpen: prefixSplit.hasChartMarkerOpen,
      briefingPrep: prefixSplit.briefingPrep,
      isBriefingPrepStreaming: prefixSplit.isBriefingPrepStreaming,
    };
  }

  const afterClose = closeIdx + THINKING_CLOSE_MARKER.length;
  const suffixRaw = text.slice(afterClose);
  const suffixSplit = stripPostThinkingSuffix(suffixRaw);

  const prefix = beforeOpen.trim();
  const suffix = suffixSplit.body.trim();
  const body =
    prefix.length > 0 && suffix.length > 0
      ? `${prefix}\n\n${suffix}`
      : `${prefix}${suffix}`.trim();

  return {
    thinking: text.slice(afterOpen, closeIdx).trim(),
    body,
    isThinkingStreaming: false,
    hasThinking: true,
    chartData: suffixSplit.chartData,
    hasChartMarkerOpen: suffixSplit.hasChartMarkerOpen,
    briefingPrep: suffixSplit.briefingPrep,
    isBriefingPrepStreaming: suffixSplit.isBriefingPrepStreaming,
  };
}
