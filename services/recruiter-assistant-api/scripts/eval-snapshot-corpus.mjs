#!/usr/bin/env node
/**
 * Saves a snapshot of the current local portfolio corpus to
 * evals/retrieval/fixtures/corpus-snapshot.json as a flat EmbeddingChunk array.
 *
 * Run this whenever portfolio content or embeddings change.
 *
 * Requires:
 *   LLAMAINDEX_INDEX_JSON_PATH pointing to a local LlamaIndex index JSON, or
 *   a llamaindex.v*.json file in services/recruiter-assistant-api/embeddings/
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadServiceEnvFiles } from "./load-local-env.mjs";

loadServiceEnvFiles();

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceRoot = join(__dirname, "..");
const repoRoot = join(serviceRoot, "../..");
const snapshotPath = join(
  repoRoot,
  "evals/retrieval/fixtures/corpus-snapshot.json"
);

const CORPUS_TEXT_METADATA_KEY = "_corpusText";
const BUSINESS_METADATA_KEYS = [
  "locale",
  "sectionId",
  "scrollTargetId",
  "title",
  "category",
];

function resolveLocalIndexPath() {
  const fromEnv = process.env.LLAMAINDEX_INDEX_JSON_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const embeddingsDir = join(serviceRoot, "embeddings");
  if (!existsSync(embeddingsDir)) return null;
  const names = readdirSync(embeddingsDir)
    .filter((n) => n.startsWith("llamaindex.v") && n.endsWith(".json"))
    .sort();
  return names.length > 0 ? join(embeddingsDir, names[names.length - 1]) : null;
}

function parseLlamaIndexJson(raw) {
  const parsed = JSON.parse(raw);
  if (parsed.vectorStore && typeof parsed.vectorStore === "object") {
    return parsed.vectorStore;
  }
  if (parsed.embeddingDict && typeof parsed.embeddingDict === "object") {
    return parsed;
  }
  throw new Error("Unrecognized LlamaIndex index JSON shape");
}

function extractChunks(vectorStore) {
  const { embeddingDict = {}, metadataDict = {} } = vectorStore;
  const nodeIds = Object.keys(embeddingDict);
  if (nodeIds.length === 0) throw new Error("Vector store has no embeddings");

  const chunks = [];
  const skipped = [];

  for (const nodeId of nodeIds) {
    const embedding = embeddingDict[nodeId];
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error(`Node "${nodeId}" has no embedding vector`);
    }

    const meta = metadataDict[nodeId];
    if (!meta || typeof meta !== "object") {
      skipped.push(nodeId);
      continue;
    }

    const text = meta[CORPUS_TEXT_METADATA_KEY];
    if (typeof text !== "string" || !text.trim()) {
      skipped.push(nodeId);
      continue;
    }

    const id =
      typeof meta.chunkId === "string" && meta.chunkId.trim()
        ? meta.chunkId.trim()
        : nodeId;

    const metadata = {};
    for (const key of BUSINESS_METADATA_KEYS) {
      if (typeof meta[key] === "string" && meta[key].trim()) {
        metadata[key] = meta[key].trim();
      }
    }

    chunks.push({ id, text: text.trim(), embedding, metadata });
  }

  if (skipped.length > 0) {
    console.warn(
      `[snapshot] Skipped ${skipped.length} node(s) with missing text/metadata`
    );
  }

  return chunks;
}

function main() {
  const indexPath = resolveLocalIndexPath();
  if (!indexPath) {
    console.error(
      "[snapshot] No local LlamaIndex index found.\n" +
        "  Run: npm run build:llamaindex-index (in services/recruiter-assistant-api)\n" +
        "  Or set LLAMAINDEX_INDEX_JSON_PATH to the index file path."
    );
    process.exit(1);
  }

  console.log(`[snapshot] Reading index: ${indexPath}`);
  const raw = readFileSync(indexPath, "utf8");
  const vectorStore = parseLlamaIndexJson(raw);
  const chunks = extractChunks(vectorStore);
  console.log(`[snapshot] Extracted ${chunks.length} chunks`);

  const dir = dirname(snapshotPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(snapshotPath, JSON.stringify(chunks, null, 2), "utf8");

  const sizeKb = Math.round(Buffer.byteLength(JSON.stringify(chunks)) / 1024);
  console.log(`[snapshot] Saved → ${snapshotPath} (${sizeKb} KB)`);

  const locales = [
    ...new Set(chunks.map((c) => c.metadata?.locale).filter(Boolean)),
  ];
  const sections = [
    ...new Set(chunks.map((c) => c.metadata?.sectionId).filter(Boolean)),
  ];
  console.log(`[snapshot] Locales: ${locales.join(", ")}`);
  console.log(`[snapshot] Sections: ${sections.join(", ")}`);
}

main();
