import { loadEmbeddingsFile } from "../../embeddings/loadEmbeddings.js";
import { filterChunksByNavigationLocale } from "../../rag/retrieve.js";
import type { RecruiterNavLocale } from "../../constants.js";
import type { PortfolioCorpus } from "../types.js";

export async function loadPortfolioCorpus(
  navLocale: RecruiterNavLocale
): Promise<PortfolioCorpus> {
  const embeddingsFile = await loadEmbeddingsFile();
  const chunksForNavLocale = filterChunksByNavigationLocale(
    embeddingsFile.chunks,
    navLocale
  );
  return {
    allChunks: embeddingsFile.chunks,
    chunksForNavLocale,
  };
}
