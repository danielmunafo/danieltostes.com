import { createRecruiterContext } from "./context/createRecruiterContext.js";
import { projectBriefingAndChart } from "./briefingChart/projectBriefingAndChart.js";
import { analyzeEvidence } from "./evidenceAnalysis/analyzeEvidence.js";
import { evaluateEvidence } from "./evidenceEvaluation/evaluateEvidence.js";
import { assessHardGates } from "./hardGates/assessHardGates.js";
import { evaluateInterests } from "./interests/evaluateInterests.js";
import { generatePitch } from "./pitch/generatePitch.js";
import { generateReferences } from "./references/generateReferences.js";

export const recruiterAgent = {
  createContext: createRecruiterContext,
  evaluateEvidence,
  assessHardGates,
  evaluateInterests,
  analyzeEvidence,
  projectBriefingAndChart,
  generatePitch,
  generateReferences,
} as const;
