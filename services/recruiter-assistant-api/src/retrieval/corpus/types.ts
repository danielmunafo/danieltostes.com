import type { RecruiterNavLocale } from "../../constants.js";
import type { PortfolioCorpus } from "../types.js";

export type RecruiterCorpusProvider = "llamaindex";

export interface PortfolioCorpusRepository {
  loadCorpus(navLocale: RecruiterNavLocale): Promise<PortfolioCorpus>;
}
