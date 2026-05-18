export function buildEvidenceBriefForPitch(
  evidenceEvaluationMarkdown: string,
  evidenceAnalysisMarkdown: string
): string {
  const parts = [
    evidenceEvaluationMarkdown || "(No evaluator output.)",
    evidenceAnalysisMarkdown || "(No analyst brief produced.)",
  ];
  return parts.join("\n\n---\n\n");
}
