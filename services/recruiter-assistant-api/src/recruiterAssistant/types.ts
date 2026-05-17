import { createOpenAI } from "@ai-sdk/openai";
import { createDataStreamResponse, type CoreMessage, type Message } from "ai";
import type { RecruiterNavLocale } from "../constants.js";
import type { InterestsPack } from "../interests/loadInterestsPack.js";
import type { HardGateAssessment } from "../rag/hardGates/index.js";
import type { ChartData } from "../rag/chartDataSchema.js";
import type { EmbeddingChunk } from "../rag/retrieve.js";

export type OpenAiProvider = ReturnType<typeof createOpenAI>;

export type RecruiterDataStream = Parameters<
  NonNullable<Parameters<typeof createDataStreamResponse>[0]["execute"]>
>[0];

export type ValidRecruiterRequest = {
  origin: string | undefined;
  clientIp: string;
  navLocale: RecruiterNavLocale;
  portfolioLanguage: string;
  uiMessages: Message[];
  coreMessages: CoreMessage[];
  guardedText: string;
};

export type RecruiterRequestValidationResult =
  | { ok: true; value: ValidRecruiterRequest }
  | { ok: false; response: Response; origin: string | undefined };

export type RecruiterAssistantDependencies = {
  openai: OpenAiProvider;
};

export type RecruiterPipelineParams = {
  request: ValidRecruiterRequest;
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
};

export type RecruiterContext = {
  interestsPack: InterestsPack | null;
  chunksForNavLocale: readonly EmbeddingChunk[];
  topChunks: readonly EmbeddingChunk[];
  sourceExcerpts: string;
};

export type EvidenceEvaluationResult = {
  evidenceEvaluationMarkdown: string;
  isOffTopic: boolean;
};

export type HardGatePipelineResult = {
  assessment: HardGateAssessment | null;
  hardGateAssessmentMarkdown: string;
  maxTechnicalFitAllowedByHardGates: number;
};

export type EvidenceAnalysisResult = {
  evidenceAnalysisMarkdown: string;
};

export type BriefingAndChartResult = {
  chartData: ChartData | null;
};

export type PitchGenerationResult = {
  assistantText: string;
};
