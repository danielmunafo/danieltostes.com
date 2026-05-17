import briefingInstructions from "../agents/briefingChart/briefingInstructions.md";
import chartInstructions from "../agents/briefingChart/chartInstructions.md";
import chartInstructionsCompact from "../agents/briefingChart/chartInstructionsCompact.md";
import evidenceAnalysisInstructions from "../agents/evidenceAnalysis/instructions.md";
import evidenceEvaluationInstructions from "../agents/evidenceEvaluation/instructions.md";
import hardGatesInstructions from "../agents/hardGates/instructions.md";
import interestsInstructions from "../agents/interests/instructions.md";
import pitchInstructions from "../agents/pitch/instructions.md";
import claimExtractionInstructions from "../agents/references/claimExtractionInstructions.md";

const INSTRUCTIONS = {
  "agents/briefingChart/briefingInstructions.md": briefingInstructions,
  "agents/briefingChart/chartInstructions.md": chartInstructions,
  "agents/briefingChart/chartInstructionsCompact.md": chartInstructionsCompact,
  "agents/evidenceAnalysis/instructions.md": evidenceAnalysisInstructions,
  "agents/evidenceEvaluation/instructions.md": evidenceEvaluationInstructions,
  "agents/hardGates/instructions.md": hardGatesInstructions,
  "agents/interests/instructions.md": interestsInstructions,
  "agents/pitch/instructions.md": pitchInstructions,
  "agents/references/claimExtractionInstructions.md":
    claimExtractionInstructions,
} as const;

export type AgentInstructionPath = keyof typeof INSTRUCTIONS;

export function getAgentInstruction(
  relativePath: AgentInstructionPath
): string {
  const content = INSTRUCTIONS[relativePath];
  if (!content?.trim()) {
    throw new Error(`Missing or empty agent instruction: ${relativePath}`);
  }
  return content;
}

export function listAgentInstructionPaths(): AgentInstructionPath[] {
  return Object.keys(INSTRUCTIONS) as AgentInstructionPath[];
}

/** Hard score-cap rules (English). Re-exported for unit tests. */
export const EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN = getAgentInstruction(
  "agents/evidenceEvaluation/instructions.md"
);
