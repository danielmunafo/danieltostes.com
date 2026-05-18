import { formatDataStreamPart } from "ai";
import { buildReferencesMarkdown } from "../../../rag/references.js";
import type { EmbeddingChunk } from "../../../rag/retrieve.js";
import type { RecruiterNavLocale } from "../../../constants.js";
import type { OpenAiProvider, RecruiterDataStream } from "../../types.js";

export async function generateReferences(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  assistantText: string;
  chunksForNavLocale: readonly EmbeddingChunk[];
  navLocale: RecruiterNavLocale;
  topChunks: readonly EmbeddingChunk[];
}): Promise<void> {
  const referencesMd = await buildReferencesMarkdown(
    params.openai,
    params.assistantText,
    params.chunksForNavLocale,
    params.navLocale,
    params.topChunks
  );
  if (referencesMd) {
    params.dataStream.write(
      formatDataStreamPart("text", `\n\n${referencesMd}\n`)
    );
  }
}
