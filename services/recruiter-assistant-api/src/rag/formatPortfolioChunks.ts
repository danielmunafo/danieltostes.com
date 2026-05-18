import {
  type RecruiterNavLocale,
  RECRUITER_CHUNK_SOURCE_LABEL,
} from "../constants.js";
import type { EmbeddingChunk } from "./retrieve.js";

/**
 * Formats retrieved chunks for the model (evidence pack for downstream prompts).
 */
export function formatPortfolioChunks(
  chunks: readonly EmbeddingChunk[],
  navLocale: RecruiterNavLocale = "en"
): string {
  const sourceWord = RECRUITER_CHUNK_SOURCE_LABEL[navLocale];
  return chunks
    .map((c, i) => {
      const title = c.metadata?.title;
      const category = c.metadata?.category;

      const label = category ? `[${category}] ${title ?? ""}` : (title ?? "");

      const header = label.trim()
        ? `### ${sourceWord} ${i + 1}: ${label.trim()}`
        : `### ${sourceWord} ${i + 1}`;

      return `${header}\n${c.text}`;
    })
    .join("\n\n");
}
