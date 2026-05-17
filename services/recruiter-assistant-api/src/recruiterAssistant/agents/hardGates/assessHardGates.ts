import type { RecruiterNavLocale } from "../../../constants.js";
import {
  assessHardGates as computeAssessment,
  extractHardGateRows,
  formatHardGateAssessmentBlock,
} from "../../../rag/hardGates/index.js";
import type { HardGatePipelineResult, OpenAiProvider } from "../../types.js";

export async function assessHardGates(params: {
  openai: OpenAiProvider;
  navLocale: RecruiterNavLocale;
  userText: string;
  evidenceEvaluationMarkdown: string;
  isOffTopic: boolean;
}): Promise<HardGatePipelineResult> {
  if (params.isOffTopic) {
    return {
      assessment: null,
      hardGateAssessmentMarkdown: "",
      maxTechnicalFitAllowedByHardGates: 10,
    };
  }

  const hardGateRows = await extractHardGateRows(
    params.openai,
    params.navLocale,
    params.userText,
    params.evidenceEvaluationMarkdown
  );
  const assessment = computeAssessment(
    hardGateRows,
    params.evidenceEvaluationMarkdown,
    params.navLocale
  );

  return {
    assessment,
    hardGateAssessmentMarkdown: formatHardGateAssessmentBlock(
      assessment,
      params.navLocale
    ),
    maxTechnicalFitAllowedByHardGates: assessment.effectiveMaxTechnicalFit,
  };
}
