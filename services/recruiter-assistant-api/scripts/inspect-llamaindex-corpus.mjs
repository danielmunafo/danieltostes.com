#!/usr/bin/env node
/**
 * Prints corpus reconstruction stats for a persisted LlamaIndex index file.
 * Usage: node scripts/inspect-llamaindex-corpus.mjs [path-to-llamaindex.v*.json]
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SimpleVectorStore } from "llamaindex";
import { ensureLlamaIndexSettings } from "./lib/configureLlamaIndexSettings.mjs";
import { loadServiceEnvFiles } from "./load-local-env.mjs";

loadServiceEnvFiles();
ensureLlamaIndexSettings();

const __dirname = dirname(fileURLToPath(import.meta.url));
const embeddingsDir = join(__dirname, "..", "embeddings");

function resolveIndexPath(argPath) {
  const trimmed = argPath?.trim();
  if (trimmed && existsSync(trimmed)) return trimmed;
  const fromEnv = process.env.LLAMAINDEX_INDEX_JSON_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  if (!existsSync(embeddingsDir)) return null;
  const names = readdirSync(embeddingsDir)
    .filter((n) => n.startsWith("llamaindex.v") && n.endsWith(".json"))
    .sort();
  return names.length > 0 ? join(embeddingsDir, names[names.length - 1]) : null;
}

async function main() {
  const indexPath = resolveIndexPath(process.argv[2]);
  if (!indexPath) {
    console.error(
      "No index file: pass a path or set LLAMAINDEX_INDEX_JSON_PATH / build llamaindex index first."
    );
    process.exit(1);
  }

  const raw = readFileSync(indexPath, "utf8");
  const parsed = JSON.parse(raw);
  const vectorStoreDict = parsed.vectorStore ?? parsed;
  const store = SimpleVectorStore.fromDict(vectorStoreDict);
  const embeddingIds = Object.keys(store.data.embeddingDict ?? {});
  const metadataIds = Object.keys(store.data.metadataDict ?? {});

  let sampleDim = 0;
  const firstId = embeddingIds[0];
  if (firstId) {
    const emb = store.data.embeddingDict[firstId];
    sampleDim = Array.isArray(emb) ? emb.length : 0;
  }

  const withText = metadataIds.filter((id) => {
    const meta = store.data.metadataDict[id];
    return typeof meta?._corpusText === "string" && meta._corpusText.length > 0;
  });

  console.log(`Index: ${indexPath}`);
  console.log(
    `Envelope: ${parsed.vectorStore ? "recruiter-llamaindex-corpus-v1" : "legacy-flat"}`
  );
  console.log(`Embedding nodes: ${embeddingIds.length}`);
  console.log(`Metadata entries: ${metadataIds.length}`);
  console.log(`Nodes with _corpusText: ${withText.length}`);
  console.log(`Sample embedding dimension: ${sampleDim}`);

  if (metadataIds.length > 0) {
    const meta = store.data.metadataDict[metadataIds[0]];
    console.log(
      "Sample metadata keys:",
      Object.keys(meta ?? {})
        .sort()
        .join(", ")
    );
  }

  if (withText.length !== embeddingIds.length) {
    console.error(
      "Reconstruction would fail: rebuild index with current build-llamaindex-index.mjs"
    );
    process.exit(1);
  }

  const localeCounts = {};
  for (const id of metadataIds) {
    const locale = store.data.metadataDict[id]?.locale ?? "(missing)";
    localeCounts[locale] = (localeCounts[locale] ?? 0) + 1;
  }
  console.log("Locale histogram (from metadata):", localeCounts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
