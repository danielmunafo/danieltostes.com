import type { RecruiterNavLocale } from "../../constants.js";
import type { PortfolioCorpus } from "../types.js";
import { llamaindexPortfolioCorpusRepository } from "./llamaindexPortfolioCorpusRepository.js";
import { validateCorpusEnv } from "./validateCorpusEnv.js";

let validated = false;

export async function loadPortfolioCorpus(
  navLocale: RecruiterNavLocale
): Promise<PortfolioCorpus> {
  if (!validated) {
    validateCorpusEnv();
    validated = true;
  }
  return llamaindexPortfolioCorpusRepository.loadCorpus(navLocale);
}

/** Test helper: re-run env validation on next load. */
export function resetPortfolioCorpusValidationForTests(): void {
  validated = false;
}
