import {
  evaluateInterests,
  scheduleInterestsEvaluation,
} from "./evaluateInterests.js";

export const interestsAgent = {
  evaluateInterests,
  scheduleEvaluation: scheduleInterestsEvaluation,
} as const;
