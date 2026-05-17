import { filterChunksByNavigationLocale } from "../../rag/retrieve.js";
import type { RecruiterNavLocale } from "../../constants.js";
import type { PortfolioCorpus } from "../types.js";
import { loadAllChunksFromLlamaIndexIndex } from "./llamaindexCorpusCache.js";
import type { PortfolioCorpusRepository } from "./types.js";

export const llamaindexPortfolioCorpusRepository: PortfolioCorpusRepository = {
  async loadCorpus(navLocale: RecruiterNavLocale): Promise<PortfolioCorpus> {
    const allChunks = await loadAllChunksFromLlamaIndexIndex();
    const chunksForNavLocale = filterChunksByNavigationLocale(
      allChunks,
      navLocale
    );
    return { allChunks, chunksForNavLocale };
  },
};
